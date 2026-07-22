# Keycloak Setup Runbook — Option 3 (BFF) — repeatable from scratch

*Supersedes `KEYCLOAK_PHASE0_SETUP.md`. This is the corrected, battle-tested procedure —
every step here reflects a real failure we hit and fixed. Follow it top to bottom and the
whole thing works. Architecture context: `KEYCLOAK_MIGRATION_REFINED.md`.*

**Architecture (Option 3 / BFF):** the custom React UI keeps its own login form. Django
brokers the password to Keycloak server-side using a confidential client. Social logins
(Google/Microsoft/GitHub) are redirect buttons — they *cannot* use the password flow.
Keycloak owns authentication; Django keeps the User row and **all RBAC**.

---

## ⚠️ The five traps that cost us hours (read first)

1. **Realm name MUST be URL-safe.** A realm named `Nexa Academy Auth` puts spaces in every
   URL, and Google rejects the broker redirect URI (`Error 400: invalid_request`). Use
   **`nexa-academy-auth`**. Newer Keycloak consoles **cannot rename a realm** — get it right at
   creation, or rename via the REST API (see Appendix B).
2. **Realm "Frontend URL" must be set to the auth host.** If it's wrong, Keycloak advertises
   an issuer on a host that doesn't serve Keycloak, and Django rejects every token.
3. **No inline `# comments` in `.env`.** `python-decouple` keeps them as part of the value.
   `KEYCLOAK_AUDIENCE=nexa-backend-bff  # note` becomes the literal value *including* the note.
4. **Client IDs must match `.env` exactly.** A one-word typo (`nexa-backend-diff` vs
   `nexa-backend-bff`) produces `invalid_client` and looks identical to "client missing".
5. **`.env` is read once at startup.** Django's autoreloader does **not** pick up `.env`
   changes — always fully restart `runserver`. Same for Vite (`import.meta.env` is baked in).

---

## Part 1 — Keycloak realm

Log into the Keycloak admin console at `https://auth.nexaacademy.co.ke`.

### 1.1 Create the realm
- **Create realm** → Realm name: **`nexa-academy-auth`** ← lowercase, no spaces. Create.
- Confirm the realm switcher (top-left) shows `nexa-academy-auth` for **every** step below.

### 1.2 Realm settings → General
- **Frontend URL:** `https://auth.nexaacademy.co.ke`  ← **critical**, prevents the issuer bug.
- (Leave blank only if Keycloak already advertises the correct host — verify in Part 4.)

### 1.3 Realm settings → Login
- User registration: **OFF**
- Forgot password: **ON**
- Email as username: **ON**
- Login with email: **ON**
- Verify email: **ON** (migrated users are imported pre-verified)

### 1.4 Realm settings → Tokens
- Access Token Lifespan: **15 minutes** (matches the app's expectation)
- Sessions tab: set SSO Idle/Max to your desired "stay logged in" window.

### 1.5 Realm roles
**Realm roles → Create role**, twice:
| Role | Purpose |
|---|---|
| `student` | default identity role |
| `admin` | staff identity role |

Do **not** create `instructor`/`super_admin` — super-admin is Django's `staff_role IS NULL`.
Fine-grained staff permissions stay in Django.

---

## Part 2 — Clients (only two are needed)

> `nexa-admissions-app` from the old plan is **not needed in Option 3** — the browser never
> calls Keycloak's token endpoint directly. Skip it.

### 2.1 `nexa-admin-automation` — for the user-migration script
1. **Clients → Create client** → Client ID: `nexa-admin-automation` → Next
2. **Client authentication: ON**
3. **Authentication flow:** tick **Service accounts roles** only. Untick Standard flow and
   Direct access grants. → Next → Save.
4. **Service account roles → Assign role → (filter by clients) → `realm-management`** →
   assign **`manage-users`**, **`view-users`** (and `query-users` if listed).
   *Optional but useful:* also assign **`view-clients`** — without it, admin-API client
   lookups silently return an empty list and diagnostics lie to you.
5. **Credentials tab → copy Client secret** → `KEYCLOAK_ADMIN_CLIENT_SECRET`.

### 2.2 `nexa-backend-bff` — the BFF (password + social exchange)
1. **Clients → Create client** → Client ID: **`nexa-backend-bff`** → Next
2. **Client authentication: ON** (confidential)
3. **Authentication flow:** tick **Standard flow** (social code exchange) **and
   Direct access grants** (password). Untick Service accounts/Implicit. → Next
4. **Valid redirect URIs** (both):
   - `https://admissions.nexaacademy.co.ke/auth/callback`
   - `http://localhost:5173/auth/callback`
   → Save
5. **Credentials tab** → Client Authenticator = **Client Id and Secret** → copy the
   **Client secret** → `KEYCLOAK_BFF_CLIENT_SECRET`.

---

## Part 3 — Google identity provider

### 3.1 Google Cloud Console
**APIs & Services → Credentials → OAuth client ID → Web application.**
**Authorized redirect URIs** — add exactly (note the space-free realm):
```
https://auth.nexaacademy.co.ke/realms/nexa-academy-auth/broker/google/endpoint
```
Copy the **Client ID** and **Client secret**. (Changes can take a few minutes to propagate.)

### 3.2 Keycloak
1. **Identity providers → Add provider → Google**
2. Paste Google's Client ID / Secret.
3. **Trust Email: ON** (skips re-verification; also enables clean account linking)
4. **Store tokens: OFF**
5. Save, then confirm the **Redirect URI** shown matches what you registered in 3.1 exactly.

### 3.3 Account linking (no duplicates)
**Identity providers → Google → First login flow** = **first broker login** (the default).
With Trust Email ON, a Google sign-in links to the existing migrated user by email instead
of creating a second account.

### 3.4 Adding Microsoft / GitHub later
1. Keycloak → **Identity providers → Add provider →** Microsoft / GitHub (register the
   equivalent broker redirect URI on their side: `.../realms/nexa-academy-auth/broker/<alias>/endpoint`).
2. Frontend `.env` → `VITE_KEYCLOAK_SOCIAL_PROVIDERS=google,microsoft,github`
3. **No code changes** — the buttons and icons render automatically.

---

## Part 4 — Application config

### 4.1 Backend `server-nexa-website/.env`
No inline comments, no quotes, no trailing spaces:
```env
KEYCLOAK_SERVER_URL=https://auth.nexaacademy.co.ke
KEYCLOAK_REALM=nexa-academy-auth
KEYCLOAK_AUDIENCE=nexa-backend-bff
KEYCLOAK_ADMIN_CLIENT_ID=nexa-admin-automation
KEYCLOAK_ADMIN_CLIENT_SECRET=<from 2.1.5>
KEYCLOAK_BFF_CLIENT_ID=nexa-backend-bff
KEYCLOAK_BFF_CLIENT_SECRET=<from 2.2.5>
```

### 4.2 Frontend `admissions-portal/.env`
```env
VITE_AUTH_PROVIDER=keycloak
VITE_KEYCLOAK_URL=https://auth.nexaacademy.co.ke
VITE_KEYCLOAK_REALM=nexa-academy-auth
VITE_KEYCLOAK_BFF_CLIENT_ID=nexa-backend-bff
VITE_KEYCLOAK_SOCIAL_PROVIDERS=google
```
Set `VITE_AUTH_PROVIDER=django` to instantly roll back to native auth.

### 4.3 Database
```bash
cd server-nexa-website && python3 manage.py migrate
```
(adds `User.keycloak_sub`)

### 4.4 Restart both
Fully stop and restart `python3 manage.py runserver` **and** `npm run dev`.

---

## Part 5 — Verify (run in order; each must pass)

### 5.1 Issuer match — catches the Frontend URL bug
```bash
cd server-nexa-website && python3 -c "
import os,django,requests
os.environ.setdefault('DJANGO_SETTINGS_MODULE','ubuntu_labs.settings'); django.setup()
from django.conf import settings as s
d=requests.get(s.KEYCLOAK_ISSUER+'/.well-known/openid-configuration',timeout=15).json()
print('discovery:', d['issuer']); print('django   :', s.KEYCLOAK_ISSUER)
print('MATCH:', d['issuer']==s.KEYCLOAK_ISSUER)"
```
Want **`MATCH: True`**. If False → fix Realm settings → General → Frontend URL (1.2).

### 5.2 Client exists — public probe, needs no permissions
```bash
cd server-nexa-website && python3 -c "
import os,django,requests
from urllib.parse import quote
os.environ.setdefault('DJANGO_SETTINGS_MODULE','ubuntu_labs.settings'); django.setup()
from django.conf import settings as s
b=f'{s.KEYCLOAK_SERVER_URL}/realms/{quote(s.KEYCLOAK_REALM)}/protocol/openid-connect/auth'
r=requests.get(b,params={'client_id':s.KEYCLOAK_BFF_CLIENT_ID,'response_type':'code','scope':'openid','redirect_uri':'http://localhost:5173/auth/callback'},allow_redirects=False,timeout=15)
print(s.KEYCLOAK_BFF_CLIENT_ID,'->','NOT FOUND' if 'Client not found' in r.text else 'EXISTS')"
```
Want **`EXISTS`**. If NOT FOUND → wrong realm, or client-id typo (trap #4).

### 5.3 BFF secret valid + Direct access grants ON
```bash
cd server-nexa-website && python3 -c "
import os,django,requests
from urllib.parse import quote
os.environ.setdefault('DJANGO_SETTINGS_MODULE','ubuntu_labs.settings'); django.setup()
from django.conf import settings as s
b=f'{s.KEYCLOAK_SERVER_URL}/realms/{quote(s.KEYCLOAK_REALM)}'
r=requests.post(b+'/protocol/openid-connect/token',data={'grant_type':'password','client_id':s.KEYCLOAK_BFF_CLIENT_ID,'client_secret':s.KEYCLOAK_BFF_CLIENT_SECRET,'username':'probe-nouser@example.com','password':'x','scope':'openid'},timeout=15)
e=r.json().get('error'); print('error:',e)
print({'invalid_grant':'OK — secret correct, direct grants ON',
       'invalid_client':'BAD — client missing or wrong secret',
       'unauthorized_client':'BAD — Direct access grants is OFF'}.get(e,r.json()))"
```
Want **`invalid_grant`** (client authenticated; only the fake user was rejected).

### 5.4 Password-hash translation unit tests
```bash
cd server-nexa-website && python3 manage.py test accounts.tests_keycloak --settings=ubuntu_labs.test_settings
```
Want **OK (4 tests)**.

### 5.5 Full end-to-end (creates + deletes a disposable user)
Proves a migrated user's **original password** logs in through the real BFF endpoint.
The script lives at `scripts/` or recreate from Appendix A. Want:
```
BFF login (orig password): 200 | access token: True | kc cookie set: True
token resolves to user   : correct user: True
refresh via cookie       : 200
wrong password rejected  : 401
```

### 5.6 Browser
`npm run dev` → `/login` → password login works → **Continue with Google** → redirects to
Keycloak → back via `/auth/callback` → dashboard. Django log should show **no**
`/api/auth/login/` or `/api/auth/refresh/` hits (those are the native-auth endpoints).

---

## Part 6 — Migrate users

```bash
cd server-nexa-website
python3 scripts/migrate_users_to_keycloak.py --limit 5        # dry run (default)
python3 scripts/migrate_users_to_keycloak.py --commit         # real run
```
- Idempotent — safe to re-run; re-runs report `exists`, never duplicate.
- **Never mutates Django users** — only writes `keycloak_sub`.
- Passwords import natively as `pbkdf2-sha256`; users keep their existing password.
- **Google-only users** (`google_linked`, unusable password) get **no** password credential —
  they sign in with Google or use "Forgot password". This is expected, not data loss.
- **Freeze signups** during the production run so no Django user is created after the snapshot.

---

## Appendix A — Troubleshooting map

| Symptom | Cause | Fix |
|---|---|---|
| `invalid_client` on login | client id typo, wrong realm, or wrong secret | 5.2 then 5.3 |
| Google `Error 400: invalid_request`, redirect_uri has spaces | realm name has spaces | realm must be `nexa-academy-auth` (trap #1 / Appendix B) |
| Google `redirect_uri_mismatch` | URI not registered in Google Cloud | 3.1 — must match 3.2 exactly |
| Every token rejected / issuer mismatch | Frontend URL wrong | 1.2, verify with 5.1 |
| `unauthorized_client` | Direct access grants OFF | 2.2.3 |
| Frontend still calls `/api/auth/login/` | `VITE_AUTH_PROVIDER` not `keycloak`, or Vite not restarted | 4.2 + 4.4 |
| Admin API returns 0 clients | service account lacks `view-clients` | 2.1.4 (optional role) |
| `.env` change has no effect | not restarted | 4.4 |

## Appendix B — Renaming an existing realm
The console cannot rename a realm; the REST API can (use your **human admin**, `master` realm):
```bash
TOKEN=$(curl -s -X POST 'https://auth.nexaacademy.co.ke/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli' -d 'grant_type=password' \
  -d 'username=ADMIN_USER' -d 'password=ADMIN_PASS' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -i -X PUT 'https://auth.nexaacademy.co.ke/admin/realms/Nexa%20Academy%20Auth' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"realm":"nexa-academy-auth"}'
```
`204` = renamed. Then redo Part 4 (both `.env` realm values), update Google's redirect URI
(3.1), re-copy client secrets if regenerated, restart both servers, and re-run Part 5.

**If the rename fails:** Realm settings → **Action → Partial export** (include clients + roles)
→ edit `"realm"` in the JSON → **Create realm → import**. Re-enter the Google IdP secret and
regenerate client secrets. Delete the old realm once Part 5 passes.

## Appendix C — Rollback
Set `VITE_AUTH_PROVIDER=django` in `admissions-portal/.env` and restart Vite. Native Django
auth is untouched and takes over immediately. Nothing in Keycloak needs undoing.
