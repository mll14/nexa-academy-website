import type { User } from '../types'

// Access token lives in memory only — never written to storage.
// The refresh token is managed as an httpOnly cookie by the backend.
// This eliminates the XSS token-theft vector from localStorage/sessionStorage.
let _accessToken: string | null = null

export const tokens = {
  get access(): string | null {
    return _accessToken
  },
  // Refresh token is backend-managed (httpOnly cookie). This getter always
  // returns null so call-sites that check it treat the session as cookie-based.
  get refresh(): string | null {
    return null
  },
  setAccess(t: string) {
    _accessToken = t
  },
  // No-op: the backend sets the refresh cookie via Set-Cookie on login/refresh responses.
  setRefresh(_t: string) {},
  clear() {
    _accessToken = null
    sessionStorage.removeItem('currentUser')
  },
}

// Non-sensitive user profile stored in sessionStorage for optimistic UI on
// page reload. Cleared when the tab closes. Not used as an auth gate — the
// httpOnly refresh cookie is the sole source of truth for session validity.
export function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem('currentUser')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: User) {
  try {
    sessionStorage.setItem('currentUser', JSON.stringify(user))
  } catch {
    // ignore — non-fatal; auth still works via cookie
  }
}

export function clearStoredUser() {
  sessionStorage.removeItem('currentUser')
}

export function isAuthenticated(): boolean {
  return _accessToken !== null
}

// Dispatched by the API layer when a refresh attempt fails mid-flight so
// AuthContext can reset React state without importing it into core.ts.
export function dispatchSessionExpired() {
  window.dispatchEvent(new CustomEvent('auth:session-expired'))
}
