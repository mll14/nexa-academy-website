import { useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { acceptInvite } from '../lib/api'
import { tokens, setStoredUser } from '../lib/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function AcceptInvite() {
  const search = useSearch({ from: '/accept-invite' }) as { uid?: string; token?: string; name?: string }
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(search.name ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const uid = search.uid ?? ''
  const token = search.token ?? ''

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
          <p className="text-destructive font-medium">Invalid invitation link.</p>
          <p className="text-sm text-muted-foreground mt-2">This link is missing required parameters. Please check the email and try again.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      const res = await acceptInvite({ uid, token, display_name: displayName, password })
      tokens.setAccess(res.access)
      tokens.setRefresh(res.refresh)
      setStoredUser(res.user)
      setDone(true)
      setTimeout(() => navigate({ to: '/admin' }), 1800)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set up account.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Account ready!</h2>
            <p className="text-sm text-muted-foreground mt-1">Taking you to the portal…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <img src="/nexa-academy-small-logo.png" alt="Nexa Academy" className="h-10 w-auto object-contain" />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#141a42] to-[#1e2a6b] px-8 py-7">
            <h1 className="text-xl font-bold text-white">Set up your account</h1>
            <p className="text-sm text-white/60 mt-1">You've been invited to the Nexa Academy Admissions Portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your full name"
                required
                autoFocus={!displayName}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="pr-10"
                  autoFocus={!!displayName}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Setting up…' : 'Finish Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
