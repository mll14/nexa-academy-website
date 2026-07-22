# Keycloak Phase 0 — Realm Setup Guide (do this from the admin console)

*Standalone setup checklist for the "Nexa Academy Auth" realm. Complete every
step here **before** any Django or frontend code changes. Companion to
[KEYCLOAK_MIGRATION_REFINED.md](./KEYCLOAK_MIGRATION_REFINED.md).*

> Written for **Keycloak 26.x** (the current admin console — left sidebar, "Clients /
> Realm roles / Identity providers / Authentication" navigation). Wording differs
> slightly on older versions but the concepts are identical.

---

## What you're building in Phase 0

By the end of this doc you will have, inside the **Nexa Academy Auth** realm:

1. Realm token/session settings tuned.
2. Two realm roles: `student`, `admin`.
3. One **confidential** client `nexa-admin-automation` (server-to-server; the user
   migration script authenticates as this).
4. One **public** client `nexa-admissions-app` (the React admissions app; Auth Code + PKCE).
5. **Google** as an identity provider, brokered through Keycloak.
6. **First Broker Login** configured to link accounts by email (no duplicates).
7. A **token mapper** so realm roles appear in the JWT as `realm_access.roles`.
8. A recorded set of values to paste into the Django `.env` (see §10).

Keep a scratch note open — you'll collect a **client secret**, the **realm issuer URL**,
and Google credentials as you go.

> ⚠️ Do all of this on a **staging realm first** if you can, and only repeat on the
> realm the migration script will hit. Never test the migration against real prod data first.

---

## 1. Realm settings

Select the **Nexa Academy Auth** realm (top-left realm switcher) before touching anything.

### 1.1 General
- **Realm settings → General**: confirm the display name. Optional: set an HTML display
  name for branded login screens later.

### 1.2 Login
- **Realm settings → Login tab:**
  - **User registration: OFF** — users come from the migration, not self-signup.
  - **Forgot password: ON** — lets migrated users who have no usable password (e.g.
    Google-only accounts) set one. (Recommended ON.)
  - **Email as username: ON**, **Login with email: ON** — this project logs in by email.
  - **Verify email: ON** (the migration script marks migrated users as already verified,
    so they won't be re-challenged).

### 1.3 Tokens
- **Realm settings → Tokens tab:**
  - **Access Token Lifespan: 15 minutes** (matches the current backend access-token TTL).
  - Leave default refresh/SSO unless you have a reason to change.

### 1.4 Sessions
- **Realm settings → Sessions tab:**
  - **SSO Session Idle** / **SSO Session Max** govern how long a login persists across
    the admissions app (and the future LMS). A common starting point: Idle 30 min,
    Max 10 hours. Tune to taste — this replaces the old 30-day refresh cookie behaviour,
    so set Max to whatever "stay logged in" window you actually want.

### 1.5 Record the issuer URL
Your realm issuer is:
```
{KEYCLOAK_SERVER_URL}/realms/Nexa Academy Auth
```
The realm name has spaces, so it is URL-encoded in the issuer as `Nexa%20Academy%20Auth`.
You can copy the exact value from **Realm settings → General → Endpoints → OpenID
Endpoint Configuration** (the `issuer` field in that JSON). Save it — Django needs it.

> 💡 Tip: realm names with spaces are legal but slightly annoying in URLs. If it's not
> too late and no clients are wired yet, consider renaming the realm to `nexa-academy`
> to avoid `%20` everywhere. Optional — not required.

---

## 2. Realm roles

**Realm roles → Create role**, twice:

| Role name | Description |
|---|---|
| `student` | Default identity role for applicants/students. |
| `admin` | Staff identity role. Fine-grained staff permissions stay in Django. |

Do **not** create `instructor` or `super_admin`. Super-admin is a Django-side concept
(an `admin` whose `staff_role` is null); Keycloak never needs to know about it.

---

## 3. Confidential client — `nexa-admin-automation`

This is used **only** by the migration script and future server-side admin tooling.
No browser ever uses it.

1. **Clients → Create client.**
2. **General settings:**
   - Client type: **OpenID Connect**
   - Client ID: `nexa-admin-automation`
   - Next.
3. **Capability config:**
   - **Client authentication: ON** ← this is what makes it *confidential*.
   - **Authentication flow:** tick **Service accounts roles** only. **Untick** Standard
     flow and Direct access grants (this client never logs a human in).
   - Next → Save.
4. **Assign admin permissions** so the script can create users:
   - Open the client → **Service accounts roles** tab → **Assign role**.
   - Change the filter to **Filter by clients**, find the **`realm-management`** client,
     and assign: **`manage-users`** and **`view-users`** (add **`query-users`** too if
     shown). That's the minimum the migration script needs.
5. **Grab the secret:**
   - **Credentials** tab → copy **Client secret**. Save it as
     `KEYCLOAK_ADMIN_CLIENT_SECRET` in your scratch note. You'll paste it into Django `.env`.

**Verify it works** (from your terminal — replace placeholders):
```bash
curl -s -X POST \
  "{KEYCLOAK_SERVER_URL}/realms/Nexa%20Academy%20Auth/protocol/openid-connect/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=nexa-admin-automation" \
  -d "client_secret=THE_SECRET_YOU_COPIED"
```
A JSON response containing `access_token` means the confidential client is good.

---

## 4. Public client — `nexa-admissions-app`

This is the React admissions frontend. Public = no secret, uses PKCE.

1. **Clients → Create client.**
2. **General settings:**
   - Client type: **OpenID Connect**
   - Client ID: `nexa-admissions-app`
   - Next.
3. **Capability config:**
   - **Client authentication: OFF** ← public client.
   - **Authentication flow:** tick **Standard flow** (Authorization Code). **Untick**
     Direct access grants and Service accounts.
   - Next.
4. **Login settings** (URLs — include dev + prod):
   - **Valid redirect URIs:**
     - `https://admissions.nexaacademy.co.ke/*`
     - `http://localhost:5173/*` (Vite dev)
   - **Valid post-logout redirect URIs:** same two URLs.
   - **Web origins:**
     - `https://admissions.nexaacademy.co.ke`
     - `http://localhost:5173`
     - (or `+` to reuse the redirect-URI origins)
   - Save.
5. **Confirm PKCE** (usually default, but verify):
   - Client → **Advanced** tab → **Proof Key for Code Exchange Code Challenge Method:**
     set to **S256**.

> Repeat this whole section later as `nexa-lms-app` when the Next.js LMS exists — same
> pattern, its own domain.

---

## 5. Google identity provider

### 5.1 Get Google credentials (Google Cloud Console)
1. Go to **Google Cloud Console → APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application.**
3. Under **Authorized redirect URIs**, add Keycloak's broker callback (you'll get the
   exact string from Keycloak in the next step, but its shape is):
   ```
   {KEYCLOAK_SERVER_URL}/realms/Nexa%20Academy%20Auth/broker/google/endpoint
   ```
4. Copy the **Client ID** and **Client secret**.

### 5.2 Add the provider in Keycloak
1. **Identity providers → Add provider → Google.**
2. Paste the **Client ID** and **Client Secret** from Google.
3. **Trust Email: ON** — Google already verified the email, so skip re-verification.
4. **Store tokens: OFF** — you're not calling Google APIs on the user's behalf.
5. Save.
6. Keycloak now shows the exact **Redirect URI** on this provider's page. Copy it and
   make sure it exactly matches what you put in Google Cloud (§5.1 step 3). Fix Google if not.

---

## 6. First Broker Login — link accounts by email

This prevents a **duplicate account** when a migrated user (who already exists by email)
signs in with Google for the first time.

1. **Authentication → Flows.**
2. Find the built-in **First broker login** flow.
3. Confirm it contains a **"Detect existing broker link" / "Confirm link existing account"**
   path that matches on email rather than always creating a new user. The default
   *first broker login* flow already does email-based linking — just confirm it's the one
   assigned. (Because Google IdP has **Trust Email ON**, verified-email matches link
   automatically.)
4. **Identity providers → Google → First login flow:** ensure it's set to
   **first broker login** (the default). Leave it if already set.

---

## 7. Token mapper — expose realm roles in the JWT

Django reads the user's role from `realm_access.roles`. Keycloak includes this by default
via the **roles** client scope, but confirm it:

1. **Client scopes → `roles` → Mappers tab → `realm roles`.**
2. Ensure:
   - **Add to access token: ON**
   - **Token Claim Name:** `realm_access.roles` (default)
   - **Multivalued: ON**
3. While here, confirm the **profile**/**email** default scopes emit `email`,
   `given_name`, `family_name` — the migration script and Django user-sync use these.

No custom mapper needed unless you changed the defaults.

---

## 8. Create a throwaway test user & verify end-to-end

1. **Users → Add user:** username/email `test@nexaacademy.co.ke`, Email verified **ON**, Create.
2. **Credentials tab → Set password**, Temporary **OFF**.
3. **Role mapping tab → Assign role →** `student`.
4. Open the **Account Console** for the realm in a private window:
   ```
   {KEYCLOAK_SERVER_URL}/realms/Nexa%20Academy%20Auth/account
   ```
   Log in with the test user. Success = the realm auth flow works.
5. **Test Google linking** (do this once you have a real Google account whose email you
   can also create as a Keycloak user): sign in with Google and confirm it **links to the
   existing user** rather than creating a second one. This validates §6.

Delete the throwaway user when done (or keep it for later staging tests).

---

## 9. Optional but recommended — export the realm config

So the realm can be recreated on a Coolify redeploy without clicking through all of the above:

- **Realm settings → Action (top-right) → Partial export** → include clients and realm
  roles → download `realm-export.json`. Store it in the repo (secrets stripped — the
  confidential client secret is **not** exported in cleartext; re-copy it after import).

---

## 10. Values to hand off to Django (`.env`)

Collect these as you go; they feed Phase 3 (Django token validation) and Phase 2 (the
migration script):

```env
KEYCLOAK_SERVER_URL=            # e.g. https://auth.nexaacademy.co.ke  (no trailing slash)
KEYCLOAK_REALM=Nexa Academy Auth
KEYCLOAK_ADMIN_CLIENT_ID=nexa-admin-automation
KEYCLOAK_ADMIN_CLIENT_SECRET=  # from §3.5 Credentials tab
KEYCLOAK_AUDIENCE=nexa-admissions-app   # expected `aud` in frontend tokens
# Derived (Django builds these, but good to note):
#   issuer = {KEYCLOAK_SERVER_URL}/realms/Nexa%20Academy%20Auth
#   jwks   = {issuer}/protocol/openid-connect/certs
```

Frontend (`admissions-portal`) will additionally need, in Phase 4:
```env
VITE_KEYCLOAK_URL={KEYCLOAK_SERVER_URL}
VITE_KEYCLOAK_REALM=Nexa Academy Auth
VITE_KEYCLOAK_CLIENT_ID=nexa-admissions-app
```

---

## 11. Completion checklist

- [ ] Realm login/token/session settings set (§1); User registration OFF; issuer URL recorded.
- [ ] Realm roles `student` and `admin` created (§2).
- [ ] Confidential client `nexa-admin-automation` created, `manage-users`/`view-users`
      assigned, secret copied, `client_credentials` curl returns a token (§3).
- [ ] Public client `nexa-admissions-app` created, PKCE S256, redirect/web-origins for
      prod + localhost (§4).
- [ ] Google IdP added, Trust Email ON, redirect URI matches Google Cloud (§5).
- [ ] First broker login confirmed to link by email (§6).
- [ ] `realm_access.roles` present in access token (§7).
- [ ] Test user logs in via Account Console; Google linking verified no-duplicate (§8).
- [ ] `realm-export.json` saved (§9, optional).
- [ ] `.env` values recorded and handed to the Django side (§10).

When every box is ticked, Phase 0 is done and Phase 1 (the `keycloak_sub` field) can begin.
