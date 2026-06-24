import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { GoogleLogin } from '@react-oauth/google'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'
import toast from 'react-hot-toast'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function redirectForUser(user: User, navigate: ReturnType<typeof useNavigate>) {
  if (user.role === 'admin') {
    navigate({ to: '/admin' })
  } else {
    navigate({ to: '/student/dashboard' })
  }
}

function LoginForm() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    const res = await login(email.trim(), password)
    setLoading(false)
    if (res.success && res.user) {
      redirectForUser(res.user, navigate)
    } else {
      toast.error(res.error ?? 'Incorrect email or password')
    }
  }

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setLoading(true)
    const res = await googleLogin(credentialResponse.credential)
    setLoading(false)
    if (res.success && res.user) {
      redirectForUser(res.user, navigate)
    } else {
      toast.error(res.error ?? 'Google login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="w-12 h-12 object-contain mx-auto mb-3"
          />
          <h1 className="font-heading text-2xl font-bold">Nexa Academy</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-center space-y-1">
          <p className="font-medium text-foreground">Applied to Nexa Academy?</p>
          <p className="text-muted-foreground text-xs">
            Sign in with the same email you used in your application. You can use Google
            or the password you set after submitting.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="pl-9 pr-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => toast.error('Google login failed')}
                  width="100%"
                />
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Want to apply?{' '}
          <a
            href="https://nexaacademy.co.ke/apply"
            className="text-primary hover:underline font-medium"
          >
            Start your application
          </a>
        </p>
      </div>
    </div>
  )
}

export function Login() {
  return <LoginForm />
}
