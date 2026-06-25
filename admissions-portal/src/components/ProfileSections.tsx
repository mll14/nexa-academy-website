/**
 * Shared profile section components used by both AdminAccountManager and StudentProfile.
 */
import { useState, useEffect } from 'react'
import {
  changePassword,
  get2FAStatus, setup2FA, verify2FA, disable2FA,
  getLoginSessions, revokeLoginSession, updateMyProfile,
} from '../lib/api'
import type { LoginSession } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import {
  Eye, EyeOff, Chrome, Smartphone, Monitor, LogOut,
  ShieldCheck, ShieldOff, Copy, Check,
} from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../lib/utils'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ── Settings card ─────────────────────────────────────────────────────────────

export function SettingsCard({
  title,
  description,
  badge,
  noPadding = false,
  children,
}: {
  title: string
  description?: string
  badge?: React.ReactNode
  noPadding?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {badge}
      </div>
      {noPadding
        ? children
        : <div className="px-6 py-5">{children}</div>}
    </div>
  )
}

// ── Password ──────────────────────────────────────────────────────────────────

export function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) { toast.error('Passwords do not match.'); return }
    if (next.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await changePassword(current, next)
      setCurrent(''); setNext(''); setConfirm('')
      toast.success('Password updated.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ps-current">Current Password</Label>
        <div className="relative">
          <Input
            id="ps-current"
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="Your current password"
            required
            className="pr-10"
          />
          <button type="button" tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrent(v => !v)}
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-new">New Password</Label>
        <div className="relative">
          <Input
            id="ps-new"
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="pr-10"
          />
          <button type="button" tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNext(v => !v)}
          >
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-confirm">Confirm New Password</Label>
        <Input
          id="ps-confirm"
          type={showNext ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          required
        />
        {confirm && next !== confirm && (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        )}
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={saving || !current || !next || !confirm} size="sm">
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </div>
    </form>
  )
}

// ── Google Sign-In ────────────────────────────────────────────────────────────

export function GoogleSection() {
  const { user, refreshUser } = useAuth()
  const isConnected = Boolean(user?.google_linked)

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const info = await infoRes.json()
        if (info.email && info.email !== user?.email) {
          toast.error(`Google account (${info.email}) doesn't match your portal email.`)
          return
        }
        await updateMyProfile({
          google_linked: true,
          ...(info.picture ? { photo_url: info.picture } : {}),
        })
        await refreshUser()
        toast.success('Google account connected.')
      } catch {
        toast.error('Failed to connect Google account.')
      }
    },
    onError: () => toast.error('Google sign-in was cancelled.'),
  })

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Chrome className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Google sign-in is not configured for this environment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
        isConnected ? 'bg-green-50' : 'bg-muted',
      )}>
        <Chrome className={cn('w-4 h-4', isConnected ? 'text-green-600' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Google</p>
        {isConnected ? (
          <p className="text-xs text-green-600">Connected — you can sign in with {user?.email}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Not connected</p>
        )}
      </div>
      {isConnected ? (
        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 shrink-0">
          Connected
        </span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => googleLogin()} className="shrink-0">
          Connect
        </Button>
      )}
    </div>
  )
}

// ── Two-Factor Authentication ─────────────────────────────────────────────────

type TwoFAStep = 'idle' | 'setup' | 'disabling'

export function TwoFASection() {
  const [enabled, setEnabled] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [step, setStep] = useState<TwoFAStep>('idle')
  const [setupData, setSetupData] = useState<{ secret: string; qr_image: string } | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    get2FAStatus()
      .then(s => setEnabled(s.enabled))
      .catch(() => {})
      .finally(() => setLoadingStatus(false))
  }, [])

  const handleStartSetup = async () => {
    setStep('setup')
    setSetupLoading(true)
    try {
      const data = await setup2FA()
      setSetupData({ secret: data.secret, qr_image: data.qr_image })
    } catch {
      toast.error('Failed to start 2FA setup.')
      setStep('idle')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await verify2FA(code)
      setEnabled(true); setStep('idle'); setSetupData(null); setCode('')
      toast.success('Two-factor authentication enabled.')
    } catch {
      toast.error('Invalid code. Check your authenticator app and try again.')
    } finally {
      setSubmitting(false) }
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await disable2FA(code)
      setEnabled(false); setStep('idle'); setCode('')
      toast.success('Two-factor authentication disabled.')
    } catch {
      toast.error('Invalid code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopySecret = () => {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const cancel = () => { setStep('idle'); setSetupData(null); setCode('') }

  const badge = !loadingStatus ? (
    <span className={cn(
      'text-xs font-medium rounded-full px-2.5 py-1 border',
      enabled
        ? 'text-green-700 bg-green-50 border-green-200'
        : 'text-muted-foreground bg-muted border-border',
    )}>
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  ) : undefined

  return (
    <SettingsCard
      title="Two-Factor Authentication"
      description="Add an extra layer of security using Google Authenticator or any TOTP app."
      badge={badge}
    >
      {loadingStatus ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : step === 'idle' ? (
        enabled ? (
          <Button variant="outline" size="sm"
            onClick={() => setStep('disabling')}
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            <ShieldOff className="w-3.5 h-3.5 mr-1.5" /> Disable 2FA
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartSetup}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Enable 2FA
          </Button>
        )
      ) : step === 'setup' ? (
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-sm font-medium">Scan QR code with your authenticator app</p>
            </div>
            {setupLoading ? (
              <div className="w-36 h-36 border border-dashed border-border rounded-xl flex items-center justify-center ml-7">
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : setupData?.qr_image ? (
              <img src={setupData.qr_image} alt="2FA QR code"
                className="w-36 h-36 border border-border rounded-xl ml-7" />
            ) : null}
            {setupData?.secret && (
              <div className="ml-7 space-y-1.5">
                <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
                <div className="flex items-center gap-2 max-w-xs">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono tracking-widest break-all">
                    {setupData.secret}
                  </code>
                  <button type="button" onClick={handleCopySecret}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copy secret"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-600" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-sm font-medium">Enter the 6-digit code to confirm</p>
            </div>
            <form onSubmit={handleVerify} className="flex gap-2 ml-7">
              <Input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                className="font-mono text-center tracking-[0.3em] w-32"
                maxLength={6} inputMode="numeric" autoComplete="one-time-code" required
              />
              <Button type="submit" disabled={submitting || code.length < 6} size="sm">
                {submitting ? 'Verifying…' : 'Verify & Enable'}
              </Button>
            </form>
          </div>

          <button type="button" onClick={cancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Disabling */
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter your current authenticator code to disable 2FA.
          </p>
          <form onSubmit={handleDisable} className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              className="font-mono text-center tracking-[0.3em] w-32"
              maxLength={6} inputMode="numeric" autoComplete="one-time-code" required
            />
            <Button type="submit" variant="destructive" disabled={submitting || code.length < 6} size="sm">
              {submitting ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          </form>
          <button type="button" onClick={cancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </SettingsCard>
  )
}

// ── Security tab ──────────────────────────────────────────────────────────────

export function SecurityTab() {
  return (
    <div className="space-y-4">
      <SettingsCard title="Password" description="Change your sign-in password.">
        <PasswordSection />
      </SettingsCard>
      <SettingsCard title="Google Sign-In" description="Connect your Google account to enable one-click sign-in.">
        <GoogleSection />
      </SettingsCard>
      <TwoFASection />
    </div>
  )
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Edg/') || ua.includes('Edge/')) return 'Microsoft Edge'
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera'
  if (ua.includes('Chrome/')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/')) return 'Safari'
  return 'Browser'
}

function parseOS(ua: string | null): string {
  if (!ua) return ''
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  return ''
}

function isMobile(ua: string | null): boolean {
  if (!ua) return false
  return /Mobile|Android|iPhone|iPad/.test(ua)
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<LoginSession[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    getLoginSessions()
      .then(setSessions)
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false))
  }, [])

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      await revokeLoginSession(id)
      setSessions(s => s.filter(sess => sess.id !== id))
      toast.success('Session revoked.')
    } catch {
      toast.error('Failed to revoke session.')
    } finally {
      setRevoking(null)
    }
  }

  const activeSessions = sessions.filter(s => s.is_current)
  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <SettingsCard
      title="Login Sessions"
      description="Where you're signed in. Revoke any session you don't recognise."
      badge={
        !loading && !unavailable && sessions.length > 0 ? (
          <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-1 border border-border">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        ) : undefined
      }
      noPadding
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading sessions…</div>
      ) : unavailable ? (
        <div className="py-12 text-center">
          <Monitor className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Session history is not yet available.</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-12 text-center">
          <Monitor className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No session history found.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Current session first */}
          {activeSessions.map(session => (
            <SessionRow key={session.id} session={session} revoking={null} onRevoke={handleRevoke} />
          ))}
          {/* Other sessions */}
          {otherSessions.length > 0 && activeSessions.length > 0 && (
            <div className="px-6 py-2 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground">Other sessions</p>
            </div>
          )}
          {otherSessions.map(session => (
            <SessionRow key={session.id} session={session} revoking={revoking} onRevoke={handleRevoke} />
          ))}
        </div>
      )}
    </SettingsCard>
  )
}

function SessionRow({
  session,
  revoking,
  onRevoke,
}: {
  session: LoginSession
  revoking: string | null
  onRevoke: (id: string) => void
}) {
  const mobile = isMobile(session.user_agent)
  const browser = parseBrowser(session.user_agent)
  const os = parseOS(session.user_agent)
  const timestamp = session.last_seen_at ?? session.created_at

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        session.is_current ? 'bg-primary/10' : 'bg-muted',
      )}>
        {mobile
          ? <Smartphone className={cn('w-4 h-4', session.is_current ? 'text-primary' : 'text-muted-foreground')} />
          : <Monitor className={cn('w-4 h-4', session.is_current ? 'text-primary' : 'text-muted-foreground')} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">
            {browser}{os ? ` · ${os}` : ''}
          </p>
          {session.is_current && (
            <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
              This session
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {session.ip_address ?? 'Unknown IP'}
          <span className="font-sans ml-2">{formatDateTime(timestamp)}</span>
        </p>
      </div>

      {!session.is_current && (
        <Button variant="ghost" size="sm"
          onClick={() => onRevoke(session.id)}
          disabled={revoking === session.id}
          className="text-muted-foreground hover:text-destructive shrink-0 gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          {revoking === session.id ? 'Revoking…' : 'Revoke'}
        </Button>
      )}
    </div>
  )
}
