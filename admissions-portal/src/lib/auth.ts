import type { User } from '../types'

export const tokens = {
  get access(): string | null {
    return localStorage.getItem('accessToken')
  },
  get refresh(): string | null {
    return localStorage.getItem('refreshToken')
  },
  setAccess(t: string) {
    localStorage.setItem('accessToken', t)
  },
  setRefresh(t: string) {
    localStorage.setItem('refreshToken', t)
  },
  clear() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
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

export function isAuthenticated(): boolean {
  return Boolean(tokens.access)
}
