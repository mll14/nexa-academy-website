# Django → Keycloak Migration Guide

*Nexa Academy — unifying auth for Admissions + LMS via Keycloak (realm: Nexa Academy Auth)*

## 1. Goal & Context

Nexa Academy currently uses Django's built-in auth (session-based, password hashes stored in the User table) with live production user data. The admissions website (a React codebase) already runs on Keycloak. This guide migrates the LMS backend off native Django auth and onto the same Keycloak realm, so a single identity serves admissions now and the LMS (to be built on Next.js 16) later.

Key decisions already made:

- Single shared Keycloak realm named "Nexa Academy Auth" — not one realm per app.
- Google is the first SSO/identity provider; others (e.g. Microsoft, GitHub) added later.
- Keycloak is deployed and running in Coolify.
- Migration must preserve existing passwords where possible — no forced mass password reset.
- Django's User model is kept as the system of record for business data (enrollments, payments, roles); Keycloak becomes the system of record for authentication only.

## 2. Target Architecture

Frontend apps — the existing React codebase for admissions, and Next.js 16 for the LMS (later) — perform an OIDC Authorization Code + PKCE login redirect to Keycloak. Keycloak issues a signed JWT. The Django REST API validates that JWT against Keycloak's JWKS endpoint on every request instead of relying on Django sessions.

1. Frontend apps redirect to Keycloak for login (Authorization Code + PKCE).
2. Keycloak authenticates the user directly, or brokers through Google, and issues access/ID tokens.
3. Frontend attaches the access token as a Bearer header on API calls.
4. Django validates the token signature/issuer/audience via Keycloak's JWKS, resolves the user via a stored Keycloak ID, and authorizes using realm-role claims mapped to Django groups/permissions.

Django keeps a link field to tie its own User records to the corresponding Keycloak identity:

```python
class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    keycloak_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
```

## 3. Realm Setup — "Nexa Academy Auth"

### 3.1 General & security settings

- Realm Settings → General: confirm display name; add a branded display name for login screens if desired later.
- Realm Settings → Login: leave "User registration" OFF; enable "Forgot password" only if self-service reset is still wanted post-migration.
- Realm Settings → Tokens: access token lifespan ~5–15 minutes; set SSO session idle/max to match desired session length.
- Realm Settings → Sessions: governs how long a login persists across admissions + LMS apps sharing this realm.

### 3.2 Confidential client — migration & admin automation

Used for server-to-server calls only (e.g. the user-migration script, future admin tooling). Never used by a browser.

1. Clients → Create client → Client ID: `nexa-admin-automation`
2. Client type: OpenID Connect
3. Client authentication: **ON** (this makes it confidential)
4. Enable "Service accounts roles"; disable Standard flow and Direct access grants (no user login needed).
5. After creation: Service account roles → Assign role → grant `manage-users` (and `view-users` / `manage-realm` as needed) from the `realm-management` client.
6. Credentials tab → copy the client secret; this is what the migration script authenticates with.

### 3.3 Public client(s) — frontend apps

There are two frontends to account for: the existing React admissions app (live now) and the future Next.js 16 LMS app (later). One client per app is recommended over a single shared client: it lets each app's token requests be scoped to only the realm roles it needs, and gives per-app login branding and audit logs. A single shared client with multiple redirect URIs is a faster way to start and can be split later without re-migrating users.

Per app (create now for admissions; repeat later for the LMS once it exists):

1. Clients → Create client → Client ID: e.g. `nexa-admissions-app` (later: `nexa-lms-app`)
2. Client type: OpenID Connect
3. Client authentication: **OFF** (public client)
4. Standard flow: **ON** (Authorization Code); Direct access grants: **OFF**
5. Valid redirect URIs: e.g. `https://admissions.nexaacademy.com/*` (later: the LMS domain)
6. Valid post-logout redirect URIs: same domain
7. Web origins: the app's origin (or `+` to reuse redirect URI origins) for CORS

### 3.4 Realm roles

Realm roles → Create role: `student`, `instructor`, `admin`, `super_admin` — matching existing Django groups. These are assigned to users and later surfaced as JWT claims Django reads.

### 3.5 Google identity provider

1. Identity providers → Add provider → Google
2. Enter Client ID / Client Secret from Google Cloud Console; add Keycloak's shown redirect URI to Google's authorized redirect URIs.
3. Trust Email: **ON** (skip re-verification for Google-verified emails).
4. Store tokens: **OFF** unless Google APIs will be called on the user's behalf later.

### 3.6 First Broker Login — account linking

This step prevents duplicate accounts for users who log in with Google before ever using a migrated password.

1. Authentication → Flows: locate or duplicate the "First Broker Login" flow.
2. Ensure the flow links to an existing account on email match rather than always creating a new user.
3. Identity providers → Google → First Login Flow: set it to this flow.

### 3.7 Client scopes / token mappers

Client scopes → default scope (or a new one) → Mappers: ensure realm roles are mapped into a token claim (`realm_access.roles` or `resource_access`) so Django can read roles from the JWT and map them to Django groups.

### 3.8 Test before touching real data

- Create one throwaway test user manually; log in via the Account Console to confirm the end-to-end flow.
- Request a token via `client_credentials` using `nexa-admin-automation`'s secret to confirm the confidential client works — this is what the migration script will use.

## 4. Migration Runbook (Phased)

### Phase 0 — Inventory & safety net

- Audit every place Django auth is touched: `request.user`, `login()`, `authenticate()`, `@login_required`, DRF `IsAuthenticated`, session middleware, password reset views, `is_active`/`is_staff` permission checks.
- Snapshot the User table; check which password hashers are in use (default is PBKDF2-SHA256, but check `PASSWORD_HASHERS` history for bcrypt/argon2 users).
- Stand up a staging Keycloak realm cloned from the Coolify config, pointed at a copy of prod data. Never test the migration against real prod first.

### Phase 1 — Keycloak realm setup

Covered in full in Section 3 above.

### Phase 2 — Django prep (no behavior change yet)

- Add the `UserProfile.keycloak_sub` field via migration; existing auth continues to work unchanged.
- Write and unit-test the credential-parsing function for Django's PBKDF2 hash format:

```python
def parse_django_hash(encoded):
    algo, iterations, salt, hash_b64 = encoded.split('$')
    assert algo == 'pbkdf2_sha256'
    return int(iterations), salt, hash_b64
```

- Flag edge cases up front: users with `unusable_password`, users hashed with a non-default hasher, inactive/soft-deleted users — route these to a forced "set your password" email instead of a fake credential.

### Phase 3 — Migration script (staging first)

1. Idempotent script: for each Django user, check Keycloak by email first (`GET /admin/realms/{realm}/users?email=`) to avoid duplicates on re-run.
2. Create the Keycloak user with `emailVerified: true` and the correct `enabled` flag, `firstName`/`lastName`.
3. Attach the parsed PBKDF2 credential in the same request or an immediate follow-up call, using the `pbkdf2-sha256` algorithm Keycloak natively supports — this avoids forcing a password reset.
4. Write the returned Keycloak UUID back into `UserProfile.keycloak_sub`.
5. Log every success/failure to a file for review before touching prod.
6. Run against staging; manually verify 10–20 real accounts can log in with their actual password directly against Keycloak.
7. Test the Google-login path for a user already created above — confirm it links rather than duplicates.

### Phase 4 — Django validates Keycloak tokens (still dual-running)

- Add JWT validation (via `mozilla-django-oidc`, or manual JWKS verification with `PyJWT`/`python-jose`) as an additional DRF authentication class — don't remove session auth yet.
- Confirm a request bearing a Keycloak-issued token resolves to the right User via `keycloak_sub`.
- Map realm roles from token claims to Django permission checks.
- Keep old session-based login fully functional in parallel during this phase.

### Phase 5 — Frontend switch (staged)

1. Wire the React admissions app to redirect to Keycloak instead of Django's login endpoint (this is the only frontend live today).
2. Store access/refresh tokens; attach as `Authorization: Bearer` on API calls.
3. Ship behind a feature flag if available, so it can be reverted instantly.
4. Watch error rates and support tickets for a few days before treating the cutover as stable.
5. When the Next.js 16 LMS app is built later, wire it to the same realm and client pattern from day one — it never needs to touch Django session auth at all.

### Phase 6 — Prod cutover

- Run the migration script against prod in a low-traffic window; freeze new signups for the duration so nothing is created in Django after the snapshot but before the Keycloak import.
- Spot-check a sample of real prod logins immediately after the import.
- Flip frontends over one at a time as validated in Phase 5, monitoring auth error rates and support inflow for 48–72 hours.
- Keep the Django password-login endpoint alive but hidden for a couple of weeks as an emergency rollback path.

### Phase 7 — Decommission old auth

- Once error rates are clean and no traffic hits the old login endpoint, remove `ModelBackend` password authentication and old login views; stop relying on session auth in DRF views.
- Keep `django.contrib.auth.User` as the permissions/business-data anchor — it simply no longer performs password checks.
- Clean up unused password reset flows and unusable-password fields.

## 5. Common Pitfalls to Avoid

- Not freezing signups during the prod import window — creates orphaned Django users with no Keycloak counterpart.
- Skipping the First Broker Login account-linking test — causes duplicate accounts for users who log in with Google before their password is ever migrated.
- Rolling out the admissions cutover without a feature flag or rollback path — makes it far harder to recover if something goes wrong.
- Assuming all users share the default PBKDF2-SHA256 hasher without checking `PASSWORD_HASHERS` history — some accounts may need a real password reset instead of a reused hash.
- Using the Implicit Flow for SPA login instead of Authorization Code + PKCE — deprecated and less secure.

## 6. Open Items for Deeper Work

- Full migration script implementation (Python, calling the Keycloak Admin REST API).
- Django JWT validation middleware / DRF authentication class implementation.
- Keycloak `realm-export.json` or Terraform config for reproducing this realm setup declaratively (useful for Coolify redeploys).