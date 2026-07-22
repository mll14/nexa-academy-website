/**
 * Account-management sections shared by the admin AccountManager and the student profile.
 *
 * Every field here is backed by a real column — personal details and address live on
 * `accounts.User`, guardians on `accounts.Guardian`, and opt-ins on
 * `accounts.NotificationPreference`. Nothing is stored client-side.
 */
import { useEffect, useState } from 'react'
import {
  updateMyProfile,
  getGuardians, createGuardian, updateGuardian, deleteGuardian,
  getNotificationPreferences, updateNotificationPreferences,
  exportMyAccount, deactivateMyAccount, deleteMyAccount,
} from '../lib/api'
import type { Guardian, NotificationPreferences, User } from '../types'
import { SettingsCard } from './ProfileSections'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Separator } from './ui/separator'
import { PhoneNumberInput } from './ui/phone-input'
import { DeleteConfirmDialog } from './ui/delete-confirm-dialog'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import {
  Plus, Pencil, Trash2, Users, Star, Wallet, Siren,
  Download, Power, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Small shared primitives ───────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {hint && <span className="text-muted-foreground font-normal text-xs ml-1.5">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

/**
 * Accessible on/off control. Built here rather than pulled in — the project's UI kit has
 * no switch and the conventions forbid adding another UI library.
 */
function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
  description?: string
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-4 py-3.5 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'mt-0.5 relative w-9 h-5 rounded-full shrink-0 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
          disabled && 'cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>
        )}
      </span>
    </label>
  )
}

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'undisclosed', label: 'Prefer not to say' },
]

// ── Personal details ──────────────────────────────────────────────────────────

type PersonalState = Pick<
  User,
  'first_name' | 'middle_name' | 'last_name' | 'date_of_birth'
  | 'gender' | 'nationality' | 'phone' | 'alt_phone'
>

function personalFrom(user: User | null): PersonalState {
  return {
    first_name: user?.first_name ?? '',
    middle_name: user?.middle_name ?? '',
    last_name: user?.last_name ?? '',
    date_of_birth: user?.date_of_birth ?? '',
    gender: user?.gender ?? '',
    nationality: user?.nationality ?? '',
    phone: user?.phone ?? '',
    alt_phone: user?.alt_phone ?? '',
  }
}

export function PersonalDetailsSection() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState<PersonalState>(() => personalFrom(user))
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)

  // Re-seed when the user object is refreshed (e.g. after a photo upload elsewhere).
  useEffect(() => {
    setForm(personalFrom(user))
    setEmail(user?.email ?? '')
  }, [user])

  const set = <K extends keyof PersonalState>(key: K, value: PersonalState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const baseline = personalFrom(user)
  const isDirty =
    email !== (user?.email ?? '') ||
    (Object.keys(baseline) as (keyof PersonalState)[]).some(k => form[k] !== baseline[k])

  const emailChanged = email !== (user?.email ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyProfile({
        ...form,
        // An empty date must clear the column, not fail validation as "".
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || '',
        email,
      })
      await refreshUser()
      toast.success(
        emailChanged
          ? 'Profile updated. Use your new email address the next time you sign in.'
          : 'Profile updated.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard
      title="Personal Information"
      description="Your name, contact details, and identity information."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="First Name" htmlFor="pd-first">
            <Input
              id="pd-first"
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              placeholder="Jane"
              required
            />
          </Field>
          <Field label="Middle Name" htmlFor="pd-middle" hint="(optional)">
            <Input
              id="pd-middle"
              value={form.middle_name}
              onChange={e => set('middle_name', e.target.value)}
              placeholder="Wanjiru"
            />
          </Field>
          <Field label="Last Name" htmlFor="pd-last">
            <Input
              id="pd-last"
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              placeholder="Doe"
              required
            />
          </Field>
        </div>

        <Field label="Email Address" htmlFor="pd-email">
          <Input
            id="pd-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {emailChanged && (
            <p className="text-xs text-amber-600 mt-1">
              This is also your sign-in address — you'll use the new one to log in.
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="pd-phone">
            <PhoneNumberInput
              id="pd-phone"
              value={form.phone ?? ''}
              onChange={v => set('phone', v)}
              defaultCountry="KE"
              placeholder="7xx xxx xxx"
            />
          </Field>
          <Field label="Alternative Phone" htmlFor="pd-alt-phone" hint="(optional)">
            <PhoneNumberInput
              id="pd-alt-phone"
              value={form.alt_phone ?? ''}
              onChange={v => set('alt_phone', v)}
              defaultCountry="KE"
              placeholder="7xx xxx xxx"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date of Birth" htmlFor="pd-dob" hint="(optional)">
            <Input
              id="pd-dob"
              type="date"
              value={form.date_of_birth ?? ''}
              onChange={e => set('date_of_birth', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            {typeof user?.age === 'number' && (
              <p className="text-xs text-muted-foreground mt-1">{user.age} years old</p>
            )}
          </Field>
          <Field label="Gender" hint="(optional)">
            <Select
              value={form.gender ?? ''}
              onChange={v => set('gender', v as PersonalState['gender'])}
              options={GENDER_OPTIONS}
              placeholder="Select…"
            />
          </Field>
          <Field label="Nationality" htmlFor="pd-nationality" hint="(optional)">
            <Input
              id="pd-nationality"
              value={form.nationality}
              onChange={e => set('nationality', e.target.value)}
              placeholder="Kenyan"
            />
          </Field>
        </div>

        {user?.id_number && (
          <>
            <Separator />
            <Field label="ID / Passport Number">
              <Input value={user.id_number} readOnly disabled className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">
                Partially hidden for your security. Contact admissions to correct it.
              </p>
            </Field>
          </>
        )}

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving || !isDirty} size="sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}

// ── Address ───────────────────────────────────────────────────────────────────

type AddressState = Pick<User, 'country' | 'county' | 'city' | 'postal_address'>

function addressFrom(user: User | null): AddressState {
  return {
    country: user?.country ?? '',
    county: user?.county ?? '',
    city: user?.city ?? '',
    postal_address: user?.postal_address ?? '',
  }
}

export function AddressSection() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState<AddressState>(() => addressFrom(user))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(addressFrom(user)) }, [user])

  const baseline = addressFrom(user)
  const isDirty = (Object.keys(baseline) as (keyof AddressState)[])
    .some(k => form[k] !== baseline[k])

  const set = <K extends keyof AddressState>(key: K, value: AddressState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyProfile(form)
      await refreshUser()
      toast.success('Address updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update address.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard title="Address" description="Where you're based. Used for correspondence.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" htmlFor="ad-country">
            <Input
              id="ad-country"
              value={form.country}
              onChange={e => set('country', e.target.value)}
              placeholder="Kenya"
            />
          </Field>
          <Field label="County / State" htmlFor="ad-county">
            <Input
              id="ad-county"
              value={form.county}
              onChange={e => set('county', e.target.value)}
              placeholder="Nairobi"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town" htmlFor="ad-city">
            <Input
              id="ad-city"
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Nairobi"
            />
          </Field>
          <Field label="Postal Address" htmlFor="ad-postal" hint="(optional)">
            <Input
              id="ad-postal"
              value={form.postal_address}
              onChange={e => set('postal_address', e.target.value)}
              placeholder="P.O. Box 12345–00100"
            />
          </Field>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving || !isDirty} size="sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}

// ── Guardians ─────────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'other', label: 'Other' },
]

const EMPTY_GUARDIAN = {
  full_name: '',
  relationship: 'parent' as const,
  phone: '',
  email: '',
  occupation: '',
  is_primary: false,
  is_emergency_contact: true,
  is_bill_payer: false,
}

type GuardianDraft = typeof EMPTY_GUARDIAN

function GuardianForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Guardian
  onCancel: () => void
  onSaved: (guardian: Guardian) => void
}) {
  const [form, setForm] = useState<GuardianDraft>(() =>
    initial
      ? {
          full_name: initial.full_name,
          relationship: initial.relationship as GuardianDraft['relationship'],
          phone: initial.phone ?? '',
          email: initial.email ?? '',
          occupation: initial.occupation ?? '',
          is_primary: initial.is_primary,
          is_emergency_contact: initial.is_emergency_contact,
          is_bill_payer: initial.is_bill_payer,
        }
      : EMPTY_GUARDIAN,
  )
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof GuardianDraft>(key: K, value: GuardianDraft[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  // The server requires one reachable contact method; mirror that here so the user finds
  // out before submitting rather than from a 400.
  const hasContact = Boolean(form.phone || form.email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasContact) {
      toast.error('Add a phone number or an email address for this guardian.')
      return
    }
    setSaving(true)
    try {
      const saved = initial
        ? await updateGuardian(initial.id, form)
        : await createGuardian(form)
      onSaved(saved)
      toast.success(initial ? 'Guardian updated.' : 'Guardian added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save guardian.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5 bg-muted/20">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="gd-name">
          <Input
            id="gd-name"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Mary Wanjiru"
            required
          />
        </Field>
        <Field label="Relationship">
          <Select
            value={form.relationship}
            onChange={v => set('relationship', v as GuardianDraft['relationship'])}
            options={RELATIONSHIP_OPTIONS}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="gd-phone">
          <PhoneNumberInput
            id="gd-phone"
            value={form.phone}
            onChange={v => set('phone', v)}
            defaultCountry="KE"
            placeholder="7xx xxx xxx"
          />
        </Field>
        <Field label="Email" htmlFor="gd-email">
          <Input
            id="gd-email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="guardian@example.com"
          />
        </Field>
      </div>

      {!hasContact && (
        <p className="text-xs text-amber-600">
          Add at least a phone number or an email address.
        </p>
      )}

      <Field label="Occupation" htmlFor="gd-occupation" hint="(optional)">
        <Input
          id="gd-occupation"
          value={form.occupation}
          onChange={e => set('occupation', e.target.value)}
          placeholder="Teacher"
        />
      </Field>

      <div className="divide-y divide-border border-y border-border">
        <Toggle
          checked={form.is_primary}
          onChange={v => set('is_primary', v)}
          label="Primary contact"
          description="The first person we contact. Only one guardian can be primary."
        />
        <Toggle
          checked={form.is_emergency_contact}
          onChange={v => set('is_emergency_contact', v)}
          label="Emergency contact"
          description="Contacted in an emergency during the programme."
        />
        <Toggle
          checked={form.is_bill_payer}
          onChange={v => set('is_bill_payer', v)}
          label="Pays the fees"
          description="Invoices and receipts will be addressed to this person."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || !form.full_name}>
          {saving ? 'Saving…' : initial ? 'Save Guardian' : 'Add Guardian'}
        </Button>
      </div>
    </form>
  )
}

function GuardianBadges({ guardian }: { guardian: Guardian }) {
  const badges: { label: string; icon: typeof Star; className: string }[] = []
  if (guardian.is_primary) {
    badges.push({
      label: 'Primary', icon: Star,
      className: 'text-primary bg-primary/10 border-primary/20',
    })
  }
  if (guardian.is_emergency_contact) {
    badges.push({
      label: 'Emergency', icon: Siren,
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    })
  }
  if (guardian.is_bill_payer) {
    badges.push({
      label: 'Pays fees', icon: Wallet,
      className: 'text-green-700 bg-green-50 border-green-200',
    })
  }
  if (!badges.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map(({ label, icon: Icon, className }) => (
        <span
          key={label}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border',
            className,
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </span>
      ))}
    </div>
  )
}

export function GuardiansSection() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Guardian | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  // The server demotes other guardians when one is promoted to primary, so a save always
  // refetches rather than patching the row in place.
  const reload = () =>
    getGuardians()
      .then(setGuardians)
      .catch(() => toast.error('Failed to load guardians.'))

  useEffect(() => {
    getGuardians()
      .then(setGuardians)
      .catch(() => toast.error('Failed to load guardians.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = async () => {
    setAdding(false)
    setEditingId(null)
    await reload()
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteGuardian(deleting.id)
      setGuardians(g => g.filter(x => x.id !== deleting.id))
      toast.success('Guardian removed.')
      setDeleting(null)
    } catch {
      toast.error('Failed to remove guardian.')
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <SettingsCard
        title="Guardians & Emergency Contacts"
        description="Optional. Add a parent, guardian, or sponsor — especially if someone else pays your fees."
        badge={
          !loading && !adding ? (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
            </Button>
          ) : undefined
        }
        noPadding
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {adding && (
              <GuardianForm onCancel={() => setAdding(false)} onSaved={handleSaved} />
            )}

            {guardians.length === 0 && !adding ? (
              <div className="py-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No guardians added yet.</p>
                <Button
                  variant="outline" size="sm" className="mt-3"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add a guardian
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {guardians.map(guardian =>
                  editingId === guardian.id ? (
                    <GuardianForm
                      key={guardian.id}
                      initial={guardian}
                      onCancel={() => setEditingId(null)}
                      onSaved={handleSaved}
                    />
                  ) : (
                    <div key={guardian.id} className="flex items-start gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {guardian.full_name}
                          <span className="text-muted-foreground font-normal ml-2">
                            {guardian.relationship_display}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[guardian.phone, guardian.email].filter(Boolean).join(' · ')}
                          {guardian.occupation ? ` · ${guardian.occupation}` : ''}
                        </p>
                        <GuardianBadges guardian={guardian} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setAdding(false); setEditingId(guardian.id) }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Edit guardian"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleting(guardian)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove guardian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </SettingsCard>

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove guardian"
        itemName={deleting?.full_name ?? ''}
        consequences="This contact will no longer be reachable for emergencies or billing."
        isPending={deletePending}
      />
    </>
  )
}

// ── Notification preferences ──────────────────────────────────────────────────

const CATEGORIES: {
  key: keyof NotificationPreferences
  label: string
  description: string
}[] = [
  {
    key: 'application_updates',
    label: 'Application updates',
    description: 'Status changes on your application — reviewed, approved, or declined.',
  },
  {
    key: 'interview_reminders',
    label: 'Interview reminders',
    description: 'Scheduling confirmations and reminders before your interview.',
  },
  {
    key: 'payment_updates',
    label: 'Payments and invoices',
    description: 'Invoices, receipts, and fee balance reminders.',
  },
  {
    key: 'program_announcements',
    label: 'Programme announcements',
    description: 'Intake dates, curriculum changes, and cohort news.',
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Occasional updates about Nexa Academy. Unsubscribe any time.',
  },
]

export function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => toast.error('Failed to load notification preferences.'))
      .finally(() => setLoading(false))
  }, [])

  // Saved immediately on toggle — a Save button on a page of switches is friction with no
  // benefit, and a failed write rolls the switch back.
  const update = async (patch: Partial<NotificationPreferences>) => {
    if (!prefs) return
    const previous = prefs
    setPrefs({ ...prefs, ...patch })
    setSaving(true)
    try {
      const saved = await updateNotificationPreferences(patch)
      setPrefs(saved)
    } catch {
      setPrefs(previous)
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SettingsCard title="Notifications" description="Choose what we contact you about.">
        <p className="text-xs text-muted-foreground">Loading…</p>
      </SettingsCard>
    )
  }

  if (!prefs) {
    return (
      <SettingsCard title="Notifications" description="Choose what we contact you about.">
        <p className="text-sm text-muted-foreground">
          Notification preferences are unavailable right now.
        </p>
      </SettingsCard>
    )
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Channels"
        description="Turn a channel off to stop every message on it."
        badge={
          saving ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : undefined
        }
      >
        <div className="divide-y divide-border -my-3.5">
          <Toggle
            checked={prefs.email_enabled}
            onChange={v => update({ email_enabled: v })}
            label="Email"
            description="Sent to your account email address."
          />
          <Toggle
            checked={prefs.sms_enabled}
            onChange={v => update({ sms_enabled: v })}
            label="SMS"
            description="Text messages to your phone number. Standard rates apply."
          />
          <Toggle
            checked={prefs.in_app_enabled}
            onChange={v => update({ in_app_enabled: v })}
            label="In-app"
            description="Notifications shown inside the portal."
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="What we send"
        description="Applies to every channel you have switched on above."
      >
        <div className="divide-y divide-border -my-3.5">
          {CATEGORIES.map(({ key, label, description }) => (
            <Toggle
              key={key}
              checked={Boolean(prefs[key])}
              onChange={v => update({ [key]: v } as Partial<NotificationPreferences>)}
              label={label}
              description={description}
              // With every channel off there is nothing left for a category to control.
              disabled={
                !prefs.email_enabled && !prefs.sms_enabled && !prefs.in_app_enabled
              }
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          Security alerts — sign-ins from new devices and password changes — are always
          sent and cannot be turned off.
        </p>
      </SettingsCard>
    </div>
  )
}

// ── Account controls (danger zone) ────────────────────────────────────────────

export function AccountControlsSection() {
  const { logout } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportMyAccount()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nexa-account-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export your data.')
    } finally {
      setExporting(false)
    }
  }

  const runDestructive = async () => {
    setBusy(true)
    try {
      if (confirm === 'deactivate') {
        await deactivateMyAccount(password || undefined)
        toast.success('Your account has been deactivated.')
      } else {
        await deleteMyAccount(password || undefined)
        toast.success('Your account has been deleted.')
      }
      // Either way the account can no longer authenticate — end the local session.
      await logout()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.')
      setBusy(false)
      setConfirm(null)
      setPassword('')
    }
  }

  return (
    <>
      <SettingsCard
        title="Your Data"
        description="Download everything we hold about your account."
      >
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Preparing…' : 'Export my data (JSON)'}
        </Button>
      </SettingsCard>

      <SettingsCard
        title="Deactivate or Delete"
        description="These actions sign you out everywhere and stop you from logging in."
        className="border-destructive/30"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline" size="sm"
            onClick={() => { setConfirm('deactivate'); setPassword('') }}
            className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <Power className="w-3.5 h-3.5" />
            Deactivate account
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => { setConfirm('delete'); setPassword('') }}
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete account
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Deactivating is reversible by an administrator. Deleting keeps your payment and
          application records but permanently disables sign-in.
        </p>
      </SettingsCard>

      {/* Password-confirm dialog for the destructive actions */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {confirm === 'deactivate' ? 'Deactivate your account?' : 'Delete your account?'}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {confirm === 'deactivate'
                    ? 'You will be signed out and cannot log in until an admin reactivates you.'
                    : 'You will be signed out and permanently lose access to this account.'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5 mb-5">
              <Label htmlFor="ac-confirm-pw">Confirm your password</Label>
              <Input
                id="ac-confirm-pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your current password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Leave blank only if you sign in with Google and have no password.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={runDestructive}
                disabled={busy}
                className={cn(
                  confirm === 'delete'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-amber-600 text-white hover:bg-amber-700',
                )}
              >
                {busy ? 'Working…' : confirm === 'deactivate' ? 'Deactivate' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
