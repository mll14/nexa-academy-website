import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { completeSocialLogin } from '../lib/socialAuth'
import { getStoredUser } from '../lib/auth'
import { useAuth } from '../context/AuthContext'

/**
 * Landing route for the social-login redirect (Option 3). Keycloak sends the browser here
 * with an authorization `code`; we hand it to Django's social/exchange endpoint, establish
 * the session, then route the user to their dashboard.
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { code, error } = useSearch({ from: '/auth/callback' })
  const [message, setMessage] = useState('Signing you in…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      if (error || !code) {
        setMessage('Sign-in was cancelled or failed. Redirecting…')
        setTimeout(() => navigate({ to: '/login', search: { redirect: undefined } }), 1500)
        return
      }
      try {
        await completeSocialLogin(code)
        await refreshUser()
        const user = getStoredUser()
        navigate({ to: user?.role === 'admin' ? '/admin' : '/student/dashboard' })
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Sign-in could not be completed.')
        setTimeout(() => navigate({ to: '/login', search: { redirect: undefined } }), 2000)
      }
    }
    run()
  }, [code, error, navigate, refreshUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
