import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Mail, Phone, User } from 'lucide-react'
import { StudentLayout } from '../../components/StudentLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { Card, CardContent } from '../../components/ui/card'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import toast from 'react-hot-toast'

interface ProfileData {
  display_name: string
  email: string
  phone?: string
  program_name?: string
  status?: string
}

export function StudentProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getProfile()
      // Try to get latest application for program/status context
      let programName: string | undefined
      let status: string | undefined
      if (data.email) {
        const appsRes = await api.getApplications({ email: data.email, ordering: '-applied_at', limit: 1 }).catch(() => ({ results: [] }))
        const app = appsRes.results[0] ?? null
        if (app) {
          programName = app.program_name
          status = app.status
        }
      }
      setProfile({
        display_name: data.display_name || '',
        email: data.email || '',
        phone: data.phone || '',
        program_name: programName,
        status,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    setChangingPassword(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setPasswordChanged(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change password. Check your current password and try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  const statusLabel: Record<string, string> = {
    pending: 'Under Review',
    reviewed: 'Being Reviewed',
    approved: 'Approved',
    interview_scheduled: 'Interview Booked',
    interview_completed: 'Interview Passed',
    enrolled: 'Enrolled',
    rejected: 'Not Admitted',
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex flex-col items-center justify-center gap-4 text-center p-8">
          <AlertCircle className="w-10 h-10 text-destructive/60" />
          <div>
            <p className="font-semibold">Could not load profile</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={load}>Try again</Button>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your account information and settings.</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {(profile?.display_name || user?.email || 'S').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold">{profile?.display_name || 'Student'}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                  <p className="text-sm font-semibold mt-0.5">{profile?.display_name || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                  <p className="text-sm font-semibold mt-0.5">{profile?.email || '—'}</p>
                </div>
              </div>

              {profile?.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                    <p className="text-sm font-semibold mt-0.5">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile?.program_name && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">Program Applied</p>
                    <p className="text-sm font-semibold mt-0.5">{profile.program_name}</p>
                    {profile.status && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Status: {statusLabel[profile.status] ?? profile.status}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Need to update your name, email, or phone number? Email us at{' '}
                <a href="mailto:admissions@nexaacademy.co.ke" className="text-primary underline font-medium">
                  admissions@nexaacademy.co.ke
                </a>{' '}
                and we'll update your details for you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Change Password</h2>
            </div>
            <Separator />

            {passwordChanged && (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Password changed successfully.
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" disabled={changingPassword} className="gap-2">
                {changingPassword
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing…</>
                  : <><KeyRound className="w-4 h-4" /> Change Password</>
                }
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">
              Forgot your password?{' '}
              <a href="/forgot-password" className="text-primary underline font-medium">
                Reset it here
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
