/// <reference types="vite/client" />

declare module '@paystack/inline-js';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
