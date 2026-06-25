import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Mail, Phone, User } from 'lucide-react'
import { StudentLayout } from '../../components/StudentLayout'
import { Button } from '../../components/ui/button'
import { UnderlineTabs } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'
import { useAuth } from '../../context/AuthContext'
import { SecurityTab, SessionsTab } from '../../components/ProfileSections'
import * as api from '../../lib/api'

interface ProfileData {
  display_name: string
  email: string
  phone?: string
  program_name?: string
  status?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Under Review',
  reviewed: 'Being Reviewed',
  approved: 'Approved',
  interview_scheduled: 'Interview Booked',
  interview_completed: 'Interview Passed',
  enrolled: 'Enrolled',
  rejected: 'Not Admitted',
}

// ── Profile tab (student — read-only) ─────────────────────────────────────────

function ProfileTab({ profile }: { profile: ProfileData }) {
  const { user } = useAuth()

  const initials = (profile.display_name || user?.email || 'S')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6 pt-6 max-w-md">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={profile.display_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">{profile.display_name || 'Student'}</p>
          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
        </div>
      </div>

      <Separator />

      {/* Info rows */}
      <div className="space-y-4">
        <InfoRow icon={User} label="Full Name" value={profile.display_name} />
        <InfoRow icon={Mail} label="Email Address" value={profile.email} />
        {profile.phone && (
          <InfoRow icon={Phone} label="Phone Number" value={profile.phone} />
        )}
        {profile.program_name && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Program Applied</p>
              <p className="text-sm font-semibold mt-0.5">{profile.program_name}</p>
              {profile.status && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {STATUS_LABELS[profile.status] ?? profile.status}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="rounded-xl bg-muted/50 border border-border p-4">
        <p className="text-xs text-muted-foreground">
          Need to update your name, email, or phone?{' '}
          <a
            href="mailto:admissions@nexaacademy.co.ke"
            className="text-primary underline font-medium"
          >
            Email us at admissions@nexaacademy.co.ke
          </a>{' '}
          and we'll update your details.
        </p>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
  { value: 'sessions', label: 'Sessions' },
]

export function StudentProfile() {
  const [activeTab, setActiveTab] = useState('profile')

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: async () => {
      const [profileData, appsRes] = await Promise.all([
        api.getProfile(),
        api.getApplications({ ordering: '-applied_at', limit: 1 }).catch(() => ({ results: [] })),
      ])
      const app = (appsRes as { results: { program_name?: string; status?: string }[] }).results[0] ?? null
      return {
        display_name: profileData.display_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        program_name: app?.program_name,
        status: app?.status,
      } satisfies ProfileData
    },
  })

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StudentLayout>
    )
  }

  if (error || !profile) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex flex-col items-center justify-center gap-4 text-center p-8">
          <AlertCircle className="w-10 h-10 text-destructive/60" />
          <div>
            <p className="font-semibold">Could not load profile</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Could not load your profile.'}
            </p>
          </div>
          <Button onClick={() => refetch()}>Try again</Button>
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

        <UnderlineTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'profile' && (
          <ProfileTab profile={profile} />
        )}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'sessions' && <SessionsTab />}
      </div>
    </StudentLayout>
  )
}
