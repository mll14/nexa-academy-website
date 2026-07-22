import { useState } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import { GoogleLogin } from '@react-oauth/google'
import { Mail, Lock, Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { useAuth } from '../context/AuthContext'
import { isKeycloak, SOCIAL_PROVIDERS } from '../config/authProvider'
import { SocialIcon } from '../components/SocialIcons'
import type { User } from '../types'
import toast from 'react-hot-toast'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function redirectForUser(user: User, navigate: ReturnType<typeof useNavigate>, redirectTo?: string) {
  if (redirectTo) {
    const isAdminPath = redirectTo.startsWith('/admin')
    const isStudentPath = redirectTo.startsWith('/student')
    if (user.role === 'admin' && isAdminPath) { navigate({ to: redirectTo as any }); return }
    if (user.role === 'student' && isStudentPath) { navigate({ to: redirectTo as any }); return }
  }
  if (user.role === 'admin') {
    navigate({ to: '/admin' })
  } else {
    navigate({ to: '/student/dashboard' })
  }
}

export function Login() {
  const { login, googleLogin, socialLogin, completeTwoFALogin } = useAuth()
  const navigate = useNavigate()
  const { redirect: redirectTo } = useSearch({ from: '/login' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [twoFAState, setTwoFAState] = useState<{ tempToken: string } | null>(null)
  const [twoFACode, setTwoFACode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    const res = await login(email.trim(), password)
    setLoading(false)
    if (res.success && res.requires_2fa) {
      setTwoFAState({ tempToken: res.temp_token })
      return
    }
    if (res.success && res.user) {
      redirectForUser(res.user, navigate, redirectTo)
    } else if (!res.success) {
      toast.error(res.error ?? 'Incorrect email or password')
    }
  }

  const handleTwoFA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFAState || twoFACode.length < 6) return
    setLoading(true)
    const res = await completeTwoFALogin(twoFAState.tempToken, twoFACode)
    setLoading(false)
    if (res.success && res.user) {
      redirectForUser(res.user, navigate, redirectTo)
    } else {
      toast.error(res.error ?? 'Invalid code. Please try again.')
      setTwoFACode('')
    }
  }

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setLoading(true)
    const res = await googleLogin(credentialResponse.credential)
    setLoading(false)
    if (res.success && 'requires_2fa' in res && res.requires_2fa) {
      setTwoFAState({ tempToken: res.temp_token })
      return
    }
    if (res.success && 'user' in res && res.user) {
      redirectForUser(res.user, navigate, redirectTo)
    } else if (!res.success) {
      toast.error('error' in res ? res.error : 'Google login failed')
    }
  }

  if (twoFAState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Two-step verification</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleTwoFA} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="totp-code">Authenticator code</Label>
                  <Input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="text-center tracking-[0.4em] text-lg font-mono"
                    placeholder="000000"
                    maxLength={6}
                    value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || twoFACode.length < 6}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setTwoFAState(null); setTwoFACode('') }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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

            {(isKeycloak ? SOCIAL_PROVIDERS.length > 0 : !!GOOGLE_CLIENT_ID) && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {isKeycloak ? (
                  <div className="space-y-2">
                    {SOCIAL_PROVIDERS.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant="outline"
                        className="w-full gap-2 [&_svg]:size-[18px]"
                        disabled={loading}
                        onClick={() => socialLogin(p)}
                      >
                        <SocialIcon provider={p} />
                        Continue with {PROVIDER_LABEL[p] ?? p}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => toast.error('Google login failed')}
                    width="100%"
                    itp_support
                  />
                )}
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

