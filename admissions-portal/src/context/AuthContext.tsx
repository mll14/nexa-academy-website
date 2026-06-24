import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import * as api from '../lib/api'
import { tokens, getStoredUser, setStoredUser } from '../lib/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  googleLogin: (token: string) => Promise<{ success: boolean; user?: User; error?: string }>
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
      if (tokens.access) await refreshUser()
      setLoading(false)
    }
    init()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const { user } = await api.login(email, password)
      setUser(user)
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  }

  const googleLogin = async (token: string) => {
    try {
      const { user } = await api.googleLogin(token)
      setUser(user)
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  }

  const logout = async (redirectTo = '/login') => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      window.location.href = redirectTo
    }
  }

  const isFullAdmin = () => user?.role === 'admin' && !user?.staffRole

  const hasPermission = (codename: string): boolean => {
    if (!user || user.role !== 'admin') return false
    // If no effectivePermissions list (legacy session or super admin), allow all
    if (!user.effectivePermissions) return true
    return user.effectivePermissions.includes(codename)
  }

  const value: AuthContextValue = {
    user,
    loading,
    login,
    googleLogin,
    logout,
    refreshUser,
    isAdmin: () => user?.role === 'admin',
    isStudent: () => user?.role === 'student',
    isAuthenticated: Boolean(tokens.access),
    isFullAdmin,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
