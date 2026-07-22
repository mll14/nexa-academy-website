/**
 * Auth provider feature flag.
 *
 * `django`  (default) — the existing DRF-SimpleJWT + httpOnly-refresh-cookie flow.
 * `keycloak`          — Authorization Code + PKCE against the Keycloak realm.
 *
 * Flip by setting VITE_AUTH_PROVIDER=keycloak at build time. Defaulting to `django`
 * means the Keycloak path is fully inert until explicitly enabled, so this can ship
 * ahead of the realm being live. See .claude/docs/KEYCLOAK_MIGRATION_REFINED.md (Phase 4).
 */
export type AuthProvider = "django" | "keycloak";

export const AUTH_PROVIDER: AuthProvider =
  import.meta.env.VITE_AUTH_PROVIDER === "keycloak" ? "keycloak" : "django";

export const isKeycloak = AUTH_PROVIDER === "keycloak";

export const KEYCLOAK_CONFIG = {
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "nexa-academy-auth",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "nexa-admissions-app",
  // The confidential BFF client. The browser only uses this id to start the social
  // redirect (front channel); Django completes the code exchange with the secret.
  bffClientId: import.meta.env.VITE_KEYCLOAK_BFF_CLIENT_ID ?? "nexa-backend-bff",
};

export type SocialProvider = "google" | "microsoft" | "github";

/** Social sign-in buttons to render, driven by env (default: Google only). */
export const SOCIAL_PROVIDERS: SocialProvider[] = (
  import.meta.env.VITE_KEYCLOAK_SOCIAL_PROVIDERS ?? "google"
)
  .split(",")
  .map((p) => p.trim().toLowerCase())
  .filter((p): p is SocialProvider =>
    p === "google" || p === "microsoft" || p === "github",
  );
