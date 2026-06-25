import type { User } from '../types'

// Access token lives in memory only — never written to localStorage.
// The refresh token is managed as an httpOnly cookie by the backend.
// This eliminates the XSS token-theft vector from localStorage.
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
    localStorage.removeItem('currentUser')
  },
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('currentUser')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: User) {
  try {
    localStorage.setItem('currentUser', JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function clearStoredUser() {
  localStorage.removeItem('currentUser')
}

export function isAuthenticated(): boolean {
  return _accessToken !== null
}
