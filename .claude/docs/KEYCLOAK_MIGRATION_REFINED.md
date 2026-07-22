# Keycloak Migration — Refined Plan (codebase-specific)

*Companion to [KEYCLOAK_MIGRATION.md](./KEYCLOAK_MIGRATION.md). Where the two
disagree, this file wins — it is written against the actual `server-nexa-website`
auth code, not the generic guide.*

---

## 0. Corrections to the original guide

The original guide was written on assumptions that do **not** match this codebase.
Read these first — they change the whole shape of the work.

| Original guide says | Reality in `server-nexa-website/` | Consequence |
|---|---|---|
| "Admissions React app already runs on Keycloak" | **Nothing is on Keycloak.** Admissions runs the home-grown DRF-SimpleJWT flow. | Frontend cutover is real work, not "already done". |
| Add `UserProfile.keycloak_sub` (OneToOne) | There is a **custom `User`** (`accounts/models.py`, UUID PK `uid`, email login). | Add `keycloak_sub` **directly on `User`**. No `UserProfile` model. |
| Realm roles `student, instructor, admin, super_admin` mapped to **Django groups** | **No Django groups used.** Roles are `student`/`admin` only; "super admin" = `admin` with `staff_role IS NULL`. There is no instructor. | Realm carries only `student` / `admin`. Super-admin stays a Django concept. |
| "Map realm roles → Django permission checks" | Fine-grained RBAC is a bespoke system: `Role` → `AppPermission` (m2m) + `staff_role` FK + `individual_permissions` + `has_app_permission()`. | **RBAC stays 100% in Django.** Keycloak never sees it. |
| (silent on 2FA) | Home-grown TOTP: `TwoFADevice` + temp-token challenge in `accounts/views.py`. | **Keycloak owns OTP going forward.** `TwoFADevice` is deprecated (decided). |
| (silent on sessions) | `LoginSession` + `refresh_jti` rotation + per-session revoke + `SessionAwareJWTAuthentication`. | Redundant once Keycloak owns sessions; retire in Phase 5. |
| Google login brokered by Keycloak | Google is verified **directly in Django** (`GoogleLoginView`). | Retire `GoogleLoginView`; Google becomes a Keycloak IdP. |
| Check `PASSWORD_HASHERS` for non-default | **Not customized** → Django default `pbkdf2_sha256`. | Passwords import natively into Keycloak. `google_linked` users have unusable passwords → route to Google/set-password. |

### Decisions locked in
- **2FA:** Keycloak owns OTP. Existing 2FA users re-enroll on first Keycloak login; `TwoFADevice` is deprecated.
- **RBAC:** Stays in Django as system of record. Keycloak token carries only the coarse `role` (`student`/`admin`). All of `permissions.py`, `has_app_permission()`, `staff_role`, `individual_permissions` keep working **unchanged**.

---

## 1. Guiding principle

**Keycloak owns authentication. Django owns everything else (business data + RBAC).**

A request flow after migration:
1. Frontend does Auth Code + PKCE against Keycloak → gets a Keycloak access token.
2. Frontend sends `Authorization: Bearer <keycloak token>` to Django.
3. Django validates signature/issuer/audience against Keycloak JWKS.
4. Django resolves the `User` by `keycloak_sub`, syncs `role` from the token's
   `realm_access.roles`, then authorizes with the **existing** permission classes.

Nothing in `accounts/permissions.py` changes. `User.has_app_permission()`,
`staff_role`, `individual_permissions`, `IsSuperAdmin` all keep working.

---

## 2. Current-state inventory (what to touch)

| File | Role today | Fate |
|---|---|---|
| `accounts/models.py` `User` | Custom user, UUID PK | **Add** `keycloak_sub` field |
| `accounts/authentication.py` `SessionAwareJWTAuthentication` | Rejects revoked-session tokens | Keep dual-run in P3; **remove** in P5 |
| `accounts/views.py` `EmailTokenObtainPairView` | Password login | Keep as rollback in P4; **remove** in P5 |
| `accounts/views.py` `GoogleLoginView` | Direct Google token verify | **Remove** in P4 (brokered by Keycloak) |
| `accounts/views.py` `_issue_tokens` / `LoginSession` | Session tracking + refresh cookie | **Remove** in P5 |
| `accounts/views.py` 2FA views + `TwoFADevice` | Home-grown TOTP | **Remove** in P5 (Keycloak OTP) |
| `accounts/views.py` forgot/reset/change-password | Password self-service | **Remove**/redirect to Keycloak in P5 |
| `accounts/permissions.py` + RBAC models | Fine-grained authz | **UNCHANGED** |
| `ubuntu_labs/settings.py` `REST_FRAMEWORK`, `SIMPLE_JWT` | Auth config | Add Keycloak auth class (P3); trim (P5) |
| `admissions-portal/src/context/AuthContext.tsx`, `lib/auth.ts`, `lib/api.ts` | Login/refresh/token storage | Rewire to Keycloak PKCE (P4) |

---

## 3. Phase 0 — Finish the Keycloak realm

Realm "nexa-academy-auth" exists. Complete the rest (original guide §3, corrected):

- **Realm roles:** create `student` and `admin` only. Do **not** create
  `instructor` or `super_admin` — super-admin is Django's `staff_role IS NULL`.
- **Confidential client** `nexa-admin-automation`: service accounts ON, standard
  flow + direct grants OFF, grant `manage-users`/`view-users` from
  `realm-management`. Copy the secret → used by the migration script only.
- **Public client** `nexa-admissions-app`: Auth Code + PKCE ON, direct grants OFF.
  Redirect URIs: `https://admissions.nexaacademy.co.ke/*` (+ `http://localhost:5173/*`
  for dev). Web origins: the same origins. (Repeat later as `nexa-lms-app`.)
- **Google IdP:** Client ID/secret from Google Cloud; add Keycloak's redirect URI to
  Google. **Trust Email ON.** Store tokens OFF.
- **First Broker Login:** ensure the flow **links to an existing account on email
  match** rather than creating a duplicate. Point Google IdP's First Login Flow at it.
- **Token mapper:** default client scope → map realm roles into `realm_access.roles`
  so Django can read them. Also confirm `email`, `given_name`, `family_name` are in
  the token/userinfo.
- **Tokens:** access lifespan 5–15 min; set SSO idle/max to your desired session length.
- **Smoke test:** one throwaway user logs in via Account Console; then request a
  `client_credentials` token with `nexa-admin-automation` to confirm the confidential
  client (this is what the migration script uses).

Env vars to add (read via `python-decouple`):
```env
KEYCLOAK_SERVER_URL=            # e.g. https://auth.nexaacademy.co.ke
KEYCLOAK_REALM=nexa-academy-auth
KEYCLOAK_ADMIN_CLIENT_ID=nexa-admin-automation
KEYCLOAK_ADMIN_CLIENT_SECRET=
KEYCLOAK_AUDIENCE=nexa-admissions-app    # expected `aud` in frontend tokens
# Derived: issuer = {SERVER_URL}/realms/{REALM}; JWKS = {issuer}/protocol/openid-connect/certs
```

---

## 4. Phase 1 — Django link field (no behavior change)

Add to `User` in `accounts/models.py`:
```python
keycloak_sub = models.CharField(
    max_length=255, unique=True, null=True, blank=True, db_index=True
)
```
`makemigrations accounts && migrate`. Existing login is untouched. This is the only
change that is safe to ship immediately, ahead of everything else.

---

## 5. Phase 2 — Migration script (staging first)

New `scripts/migrate_users_to_keycloak.py`. Uses the confidential client. Idempotent.

For each Django `User`:
1. `GET /admin/realms/{realm}/users?email=` — skip/update if already present (safe re-run).
2. Create with `emailVerified: true`, `enabled = user.is_active`, `firstName`/`lastName`
   split from `display_name`, `username = email`.
3. **Password:**
   - Has usable `pbkdf2_sha256$...` hash → import as a Keycloak credential with the
     native `pbkdf2-sha256` algorithm (parse `algo$iterations$salt$hash`). No reset needed.
   - `google_linked` or unusable password → **no credential**; user signs in with Google
     (auto-linked by email) or uses Keycloak "forgot password".
4. Write the returned Keycloak UUID back into `User.keycloak_sub`.
5. Assign realm role `admin` if `user.role == 'admin'`, else `student`.
6. Log every success/failure to a file.

Validate on **staging against a copy of prod** before touching prod: manually log in
10–20 real accounts with their actual passwords; test the Google path links (not duplicates).

---

## 6. Phase 3 — Django validates Keycloak tokens (dual-run)

New `accounts/authentication.py` → `KeycloakJWTAuthentication(BaseAuthentication)`:
- Fetch + cache JWKS from `{issuer}/protocol/openid-connect/certs`.
- Verify signature (RS256), `iss`, `aud` (`KEYCLOAK_AUDIENCE`), `exp`.
- Resolve user: by `keycloak_sub` → fall back to `email` and **backfill** `keycloak_sub`
  on first hit (covers users created in Keycloak before the script ran).
- Sync `role` from `realm_access.roles` (`admin` if present else `student`); save if changed.
- Return `(user, validated_token)`. **Do not** touch `staff_role`/permissions — RBAC is
  resolved later by the existing permission classes.

Wire it **alongside** the old class so both token types work during cutover:
```python
'DEFAULT_AUTHENTICATION_CLASSES': (
    'accounts.authentication.KeycloakJWTAuthentication',
    'accounts.authentication.SessionAwareJWTAuthentication',  # legacy, remove in P5
),
```
Add `python-jose[cryptography]` (or reuse `PyJWT` + JWKS) to `requirements.txt`.

---

## 7. Phase 4 — Frontend cutover (admissions-portal)

Behind a feature flag, rewire the three auth touch-points:
- `src/context/AuthContext.tsx` — replace `login`/`googleLogin`/`completeTwoFALogin`
  with a Keycloak Auth Code + PKCE redirect (use `keycloak-js` or `oidc-client-ts`).
  `logout` → Keycloak end-session endpoint.
- `src/lib/auth.ts` — access token still in memory; refresh now via the Keycloak adapter
  (silent refresh / refresh token) instead of the Django httpOnly cookie.
- `src/lib/api.ts` — attach the Keycloak access token as `Authorization: Bearer`.

Retire the direct Google button path (`GoogleLoginView`) — Google is now a Keycloak IdP.
2FA UI (`TwoFA*`) is removed; OTP is enrolled/prompted by Keycloak. Keep the flag so you
can revert instantly. Watch auth error rates for a few days.

> Security note: today's httpOnly-refresh-cookie design is actually *stronger* than a
> typical in-memory SPA token. Confirm the Keycloak adapter's token storage choice
> (prefer in-memory + short access tokens; avoid `localStorage` for refresh tokens).

---

## 8. Phase 5 — Prod cutover & decommission

1. **Freeze signups** during the prod import window (disable `SignUpView` /
   `create_user` paths) so no Django user is created after the snapshot.
2. Run the migration script against prod in a low-traffic window; spot-check real logins.
3. Flip the frontend flag; monitor auth errors + support for 48–72h. Keep the Django
   password endpoint alive-but-hidden as rollback for ~2 weeks.
4. When clean, remove: `SessionAwareJWTAuthentication`, `LoginSession` + `_issue_tokens`
   + refresh-cookie helpers, `EmailTokenObtainPairView`, `GoogleLoginView`, 2FA views +
   `TwoFADevice`, forgot/reset/change-password views, and `rest_framework_simplejwt` from
   `DEFAULT_AUTHENTICATION_CLASSES`. Keep `simplejwt` installed only if something else
   needs it; otherwise drop it.
5. **Keep** the `User` table, `role`, and the entire RBAC system — it no longer performs
   password checks, that's all.

---

## 9. Testing

- Migration script: unit-test the `pbkdf2_sha256$...` parser and the "google_linked →
  no credential" branch. Mock the Keycloak Admin REST calls; no live calls in tests.
- `KeycloakJWTAuthentication`: unit-test with a locally-signed JWT against a fake JWKS —
  cover valid, wrong-`aud`, expired, unknown-`sub`-fallback-to-email, and role-sync.
- Keep the existing `permissions.py` tests green throughout — they must never change.

## 10. Open items
- Confirm the admissions frontend adapter choice (`keycloak-js` vs `oidc-client-ts`).
- `realm-export.json` for reproducible Coolify redeploys of the realm config.
- Decide whether to keep `LoginSession` purely for audit history (read-only) or drop it.
