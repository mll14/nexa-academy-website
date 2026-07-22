/**
 * Social login for Option 3. External IdPs (Google/Microsoft/GitHub) can't go through the
 * BFF password flow — they need the Authorization Code redirect. This starts that redirect
 * with PKCE against Keycloak (using the BFF client id + kc_idp_hint), and, on return,
 * hands the code to Django's /auth/keycloak/social/exchange/ which does the secret-bearing
 * token exchange and sets the httpOnly session cookie.
 */
import { KEYCLOAK_CONFIG, type SocialProvider } from "../config/authProvider";
import { BASE } from "./api/core";
import { getProfile } from "./api/auth";
import { tokens, setStoredUser } from "./auth";

const VERIFIER_KEY = "kc_pkce_verifier";
const CALLBACK_PATH = "/auth/callback";

function base64url(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function callbackRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

/** Redirect the browser to Keycloak to authenticate with the given social provider. */
export async function startSocialLogin(provider: SocialProvider): Promise<void> {
  const verifier = randomVerifier();
  const challenge = await challengeFromVerifier(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.bffClientId,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: callbackRedirectUri(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    kc_idp_hint: provider,
  });
  const realm = encodeURIComponent(KEYCLOAK_CONFIG.realm);
  window.location.href =
    `${KEYCLOAK_CONFIG.url}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`;
}

/** Exchange the returned authorization code (via Django) and establish the session. */
export async function completeSocialLogin(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Your sign-in session expired. Please try again.");

  const res = await fetch(`${BASE}/auth/keycloak/social/exchange/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: callbackRedirectUri() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access) {
    throw new Error(data.detail || data.error || "Sign-in could not be completed.");
  }
  tokens.setAccess(data.access);
  setStoredUser(await getProfile());
}
