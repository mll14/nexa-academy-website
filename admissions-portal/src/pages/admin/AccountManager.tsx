import { useState } from 'react'
import { AdminLayout } from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { updateMyProfile, changePassword } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Eye, EyeOff, User, Chrome } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.display_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  const isDirty = name !== (user?.display_name ?? '') || email !== (user?.email ?? '') || phone !== (user?.phone ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyProfile({ display_name: name, email, phone })
      await refreshUser()
      toast.success('Profile updated.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Profile" description="Update your name, email address, and phone number.">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" />
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving || !isDirty} size="sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function PasswordSection() {
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
    <Section title="Password" description="Change your sign-in password.">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="current">Current Password</Label>
          <div className="relative">
            <Input
              id="current"
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Your current password"
              required
              className="pr-10"
            />
            <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(v => !v)}>
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              className="pr-10"
            />
            <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNext(v => !v)}>
              {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type={showNext ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            required
          />
          {confirm && next !== confirm && <p className="text-xs text-destructive">Passwords do not match.</p>}
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving || !current || !next || !confirm} size="sm">
            {saving ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function GoogleSectionContent() {
  const { user, refreshUser } = useAuth()
  const [linked, setLinked] = useState(false)

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { updateMyProfile: update } = await import('../../lib/api')
        // Fetch profile from Google to get photo_url
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const info = await infoRes.json()
        if (info.email && info.email !== user?.email) {
          toast.error(`Google account email (${info.email}) doesn't match your portal email (${user?.email}).`)
          return
        }
        if (info.picture) {
          await update({ photo_url: info.picture })
          await refreshUser()
        }
        setLinked(true)
        toast.success('Google account connected.')
      } catch {
        toast.error('Failed to connect Google account.')
      }
    },
    onError: () => toast.error('Google sign-in was cancelled.'),
  })

  return (
    <Section title="Google Sign-In" description="Connect your Google account to sign in with Google on the login page.">
      <div className="flex items-center gap-4 max-w-md">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Chrome className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Google</p>
          {linked || user?.photo_url ? (
            <p className="text-xs text-green-600">Connected — you can sign in with Google at {user?.email}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Not connected — click to link your Google account</p>
          )}
        </div>
        {!linked && !user?.photo_url && (
          <Button variant="outline" size="sm" onClick={() => googleLogin()}>
            Connect
          </Button>
        )}
        {(linked || user?.photo_url) && (
          <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">Connected</span>
        )}
      </div>
    </Section>
  )
}

function GoogleSection() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Section
        title="Google Sign-In"
        description="Connect your Google account to sign in with Google on the login page."
      >
        <div className="flex items-center gap-4 max-w-md">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Chrome className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Google</p>
            <p className="text-xs text-muted-foreground">
              Google sign-in is not configured for this environment.
            </p>
          </div>
        </div>
      </Section>
    )
  }

  return <GoogleSectionContent />
}

export function AccountManager() {
  const { user } = useAuth()

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">My Account</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <ProfileSection />
        <PasswordSection />
        <GoogleSection />
      </div>
    </AdminLayout>
  )
}
