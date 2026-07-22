import { useRef, useState } from 'react'
import { AdminLayout } from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { uploadPhoto } from '../../lib/api'
import { SecurityTab, SessionsTab } from '../../components/ProfileSections'
import {
  PersonalDetailsSection,
  AddressSection,
  NotificationPreferencesSection,
} from '../../components/AccountSections'
import { User, Shield, Monitor, Camera, Bell } from 'lucide-react'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

// ── Sidebar tab nav ───────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile',       label: 'Profile',       icon: User    },
  { value: 'security',      label: 'Security',      icon: Shield  },
  { value: 'sessions',      label: 'Sessions',      icon: Monitor },
  { value: 'notifications', label: 'Notifications', icon: Bell    },
] as const

type Tab = typeof TABS[number]['value']

// ── Avatar with change-photo ──────────────────────────────────────────────────

function Avatar() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const initials = (user?.display_name || user?.email || 'A')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }

    setUploading(true)
    try {
      await uploadPhoto(file)
      await refreshUser()
      toast.success('Photo updated.')
    } catch {
      toast.error('Failed to upload photo.')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected if needed
      e.target.value = ''
    }
  }

  return (
    <div className="relative shrink-0 group">
      {user?.photo_url ? (
        <img
          src={user.photo_url}
          alt={user?.display_name}
          className="w-20 h-20 rounded-2xl object-cover border border-border shadow-sm"
        />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">{initials}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={cn(
          'absolute inset-0 rounded-2xl flex items-center justify-center',
          'bg-black/0 group-hover:bg-black/40 transition-colors',
          'opacity-0 group-hover:opacity-100',
        )}
        title="Change photo"
      >
        <Camera className="w-5 h-5 text-white drop-shadow" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  return (
    <div className="space-y-4">
      <PersonalDetailsSection />
      <AddressSection />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AccountManager() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* ── Identity header ── */}
        <div className="flex items-center gap-5 pb-8 border-b border-border">
          <Avatar />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate leading-tight">
              {user?.display_name || 'Admin'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-1 border border-border">
                {user?.staffRole ? user.staffRole.name : 'Super Admin'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Hover the photo to change it</p>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col gap-8 lg:flex-row">

          {/* Sidebar nav */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:w-44 shrink-0 pb-1 lg:pb-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-colors text-left whitespace-nowrap',
                  'min-w-[110px] lg:min-w-0 lg:w-full',
                  activeTab === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile'       && <ProfileTab />}
            {activeTab === 'security'      && <SecurityTab />}
            {activeTab === 'sessions'      && <SessionsTab />}
            {activeTab === 'notifications' && <NotificationPreferencesSection />}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
