# Keycloak Phase 5 — Decommission Checklist (run ONLY after a validated cutover)

*Do not start this until the Keycloak cutover has run clean in production for 48–72h and
the Django password endpoint has seen no real traffic. Removing legacy auth early breaks
login. This is a checklist, not something to auto-apply.*

## Preconditions
- [ ] Prod migration script run; spot-checked real logins succeed against Keycloak.
- [ ] `VITE_AUTH_PROVIDER=keycloak` shipped; auth error rates flat for 48–72h.
- [ ] Every active user has a non-null `keycloak_sub` (verify:
      `User.objects.filter(keycloak_sub__isnull=True, is_active=True).count() == 0`).
- [ ] No hits on the Django password login endpoint in logs for ≥1 week.

## Backend removals (`server-nexa-website`)
- [ ] `ubuntu_labs/settings.py` → drop `SessionAwareJWTAuthentication` from
      `DEFAULT_AUTHENTICATION_CLASSES`, leaving only `KeycloakJWTAuthentication`.
- [ ] `accounts/authentication.py` → delete `SessionAwareJWTAuthentication`.
- [ ] `accounts/views.py` → delete `EmailTokenObtainPairView`, `GoogleLoginView`,
      `_issue_tokens` + refresh-cookie helpers (`_set_refresh_cookie`/`_clear_refresh_cookie`),
      `CustomTokenRefreshView`, `LogoutView`, `ForgotPasswordView`, `ResetPasswordView`,
      `ChangePasswordView`, and all 2FA views (`TwoFA*`).
- [ ] `accounts/urls.py` → remove the routes for the deleted views (`login/`, `refresh/`,
      `logout/`, `forgot-password/`, `reset-password/`, `change-password/`, `2fa/*`,
      `login/google/`, `sessions/*`).
- [ ] `accounts/models.py` → after a data-retention decision, drop `TwoFADevice` and
      (optionally) `LoginSession`; keep `AuditLog`. Create the migration.
- [ ] `AcceptInviteView` / staff-invite flow → re-point to Keycloak (invite creates the
      Keycloak user + sends a Keycloak "set password" action email) rather than setting a
      Django password. This is the one flow that needs rework, not just deletion.
- [ ] `requirements.txt` → remove `djangorestframework-simplejwt`, `pyotp`, `qrcode`
      **only if** nothing else imports them; drop `token_blacklist` from `INSTALLED_APPS`.
- [ ] **Keep**: `User` + `role`, and the entire RBAC (`Role`, `AppPermission`, `staff_role`,
      `individual_permissions`, `permissions.py`, `has_app_permission`). Unchanged.

## Frontend removals (`admissions-portal`)
- [ ] `src/config/authProvider.ts` → collapse the flag; make Keycloak the only path
      (or keep the flag one release longer as a kill-switch).
- [ ] `src/lib/api/core.ts` → remove the Django `refreshToken` branch + `tryRefreshToken`.
- [ ] `src/context/AuthContext.tsx` → delete the `else` (Django) branches in
      init/login/googleLogin/logout and the `completeTwoFALogin` path.
- [ ] `src/lib/api/auth.ts` → remove `login`, `adminLogin`, `googleLogin`,
      `completeTwoFALogin`, `forgotPassword`, `resetPassword`, `changePassword`, 2FA and
      login-session functions. Keep profile/roles/staff/students/audit calls.
- [ ] `src/pages/Login.tsx` → drop the Django email/password + `GoogleLogin` blocks and
      the 2FA screen; keep the SSO button branch. Remove `@react-oauth/google` +
      `GoogleOAuthProvider` in `main.tsx` if Google is only used for login.
- [ ] Remove now-dead 2FA / session-management UI in settings pages.

## After removal
- [ ] `python3 manage.py test accounts --settings=ubuntu_labs.test_settings` green.
- [ ] `npm run type-check` + `npm run build` green.
- [ ] Delete the throwaway Keycloak test user; rotate the `nexa-admin-automation` secret
      if the migration script ran anywhere shared.
