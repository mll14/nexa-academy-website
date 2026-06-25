import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import * as api from '../lib/api'
import { tokens, getStoredUser, setStoredUser, clearStoredUser } from '../lib/auth'
import type { User } from '../types'

type LoginResponse =
  | { success: true; user: User; requires_2fa?: false }
  | { success: false; error: string }
  | { success: true; requires_2fa: true; temp_token: string }

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  completeTwoFALogin: (temp_token: string, code: string) => Promise<{ success: boolean; user?: User; error?: string }>
  googleLogin: (token: string) => Promise<LoginResponse>
  logout: (redirectTo?: string) => Promise<void>
  refreshUser: () => Promise<void>
  isAdmin: () => boolean
  isStudent: () => boolean
  isAuthenticated: boolean
  /** True when the user is an admin with no staff_role (unrestricted super admin). */
  isFullAdmin: () => boolean
  /** Check if the current user has a specific permission codename. */
  hasPermission: (codename: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!tokens.access) return
    try {
      const profile = await api.getProfile()
      setUser(profile)
      setStoredUser(profile)
      // Correct stale routing: if session pre-dates a role promotion, re-navigate
      const pathname = window.location.pathname
      if (
        profile.role === 'admin' &&
        (pathname === '/' || pathname.startsWith('/student') || pathname === '/login')
      ) {
        window.location.replace('/admin')
      } else if (
        profile.role === 'student' &&
        pathname.startsWith('/admin')
      ) {
        window.location.replace('/login')
      }
    } catch {
      // keep cached user if network fails
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      // If there's a cached user, try to restore their session from the httpOnly
      // refresh cookie. On page reload the in-memory access token is gone, so
      // we must exchange the cookie for a fresh access token first.
      if (getStoredUser()) {
        const restored = await api.tryRefreshToken()
        if (restored) {
          await refreshUser()
        } else {
          // Cookie expired or was revoked — clear the stale cached user
          setUser(null)
          clearStoredUser()
        }
      }
      setLoading(false)
    }
    init()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const result = await api.login(email, password)
      if ('requires_2fa' in result && result.requires_2fa) {
        return { success: true, requires_2fa: true, temp_token: result.temp_token }
      }
      const { user } = result as { user: User; role: string }
      setUser(user)
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  }, [])

  const completeTwoFALogin = useCallback(async (temp_token: string, code: string) => {
    try {
      const { user } = await api.completeTwoFALogin(temp_token, code)
      setUser(user)
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Invalid code. Please try again.' }
    }
  }, [])

  const googleLogin = useCallback(async (token: string): Promise<LoginResponse> => {
    try {
      const result = await api.googleLogin(token)
      if ('requires_2fa' in result && result.requires_2fa) {
        return { success: true, requires_2fa: true, temp_token: result.temp_token }
      }
      const { user } = result as { user: User }
      setUser(user)
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  }, [])

  const logout = useCallback(async (redirectTo = '/login') => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      window.location.href = redirectTo
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    completeTwoFALogin,
    googleLogin,
    logout,
    refreshUser,
    isAdmin: () => user?.role === 'admin',
    isStudent: () => user?.role === 'student',
    isAuthenticated: Boolean(tokens.access),
    isFullAdmin: () => user?.role === 'admin' && !user?.staffRole,
    hasPermission: (codename: string) => {
      if (!user || user.role !== 'admin') return false
      // If no effectivePermissions list (legacy session or super admin), allow all
      if (!user.effectivePermissions) return true
      return user.effectivePermissions.includes(codename)
    },
  }), [user, loading, login, completeTwoFALogin, googleLogin, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
