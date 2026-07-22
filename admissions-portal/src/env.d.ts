/// <reference types="vite/client" />

declare module '@paystack/inline-js';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  // Keycloak (Phase 4) — auth stays on Django until VITE_AUTH_PROVIDER=keycloak.
  readonly VITE_AUTH_PROVIDER?: "django" | "keycloak";
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  // BFF client used for the social redirect (Option 3); code exchange happens server-side.
  readonly VITE_KEYCLOAK_BFF_CLIENT_ID?: string;
  // Comma-separated social IdP aliases to show buttons for, e.g. "google,microsoft,github".
  readonly VITE_KEYCLOAK_SOCIAL_PROVIDERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
