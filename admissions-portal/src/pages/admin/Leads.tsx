import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Flame, HelpCircle, FileWarning, Search,
  Mail, Phone, BookOpen, Calendar, MessageSquare,
  ChevronRight, Bell, PhoneCall, Send,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { ProgramInterest, HelpMeLead, IncompleteApplication } from '../../types'

const PAGE_SIZE = 20

type Tab = 'interests' | 'help_me' | 'incomplete'


function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-all">{value}</span>
      </div>
    </div>
  )
}

function Avatar({ name, email }: { name?: string; email: string }) {
  const initials = (name || email).charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{initials}</span>
    </div>
  )
}

// ─── Notify form (shared: individual or bulk) ─────────────────────────────────

function NotifyForm({
  programSlug, programName, ids, onDone,
}: {
  programSlug: string; programName: string; ids?: string[]; onDone: () => void
}) {
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.notifyProgramInterests({
      program_slug: programSlug || undefined,
      program_name: programName || undefined,
      start_date: startDate,
      deadline: deadline || undefined,
      ids: ids?.length ? ids : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Sent ${res.sent} notification${res.sent !== 1 ? 's' : ''}${res.failed ? ` (${res.failed} failed)` : ''}`)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send notifications'),
  })

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
        <Bell className="w-3.5 h-3.5" /> Notify of Intake Opening
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Cohort start date *</Label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Application deadline</Label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={!startDate || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Bell className="w-3.5 h-3.5 mr-1.5" />
        {mutation.isPending ? 'Sending…' : ids?.length ? 'Send Notification' : `Notify All for ${programName || programSlug}`}
      </Button>
    </div>
  )
}

// ─── Interest detail dialog ───────────────────────────────────────────────────

function whatsappUrl(phone?: string) {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  return `https://wa.me/${digits}`
}

function InterestDetailDialog({ item, onClose }: { item: ProgramInterest; onClose: () => void }) {
  const [showNotify, setShowNotify] = useState(false)
  return (
    <Dialog open onClose={() => { onClose(); setShowNotify(false) }}
      title={item.name || 'Interest Submission'} description={item.email} className="max-w-md">
      <div className="space-y-4">
        <div className="divide-y divide-border">
          <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={item.email} />
          <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={item.phone} />
          <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Program" value={item.program_name || item.program_slug} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Submitted" value={formatDate(item.created_at)} />
        </div>

        {/* Reach-out actions */}
        <div className="grid grid-cols-3 gap-2">
          <a href={`mailto:${item.email}?subject=Re: Your Interest in ${item.program_name || item.program_slug} | Nexa Academy`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors text-center">
            <Mail className="w-5 h-5 text-primary" />
            Email
          </a>
          {item.phone ? (
            <a href={`tel:${item.phone}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-green-50 hover:border-green-300 transition-colors text-center">
              <PhoneCall className="w-5 h-5 text-green-600" />
              Call
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
              <PhoneCall className="w-5 h-5 text-muted-foreground" />
              Call
            </div>
          )}
          {whatsappUrl(item.phone) ? (
            <a href={whatsappUrl(item.phone)!} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-[#25D366]/10 hover:border-[#25D366]/40 transition-colors text-center">
              <Send className="w-5 h-5 text-[#25D366]" />
              WhatsApp
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
              <Send className="w-5 h-5 text-muted-foreground" />
              WhatsApp
            </div>
          )}
        </div>

        {item.message && (
          <>
            <Separator />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </p>
              <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
              </div>
            </div>
          </>
        )}

        <Separator />
        {showNotify ? (
          <NotifyForm
            programSlug={item.program_slug}
            programName={item.program_name}
            ids={[item.id]}
            onDone={() => setShowNotify(false)}
          />
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowNotify(true)}>
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify of Intake Opening
          </Button>
        )}
      </div>
    </Dialog>
  )
}

// ─── Tab 1: Coming-soon interests ────────────────────────────────────────────

function InterestsTab() {
  const [search, setSearch] = useState('')
  const [programSlug, setProgramSlug] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ProgramInterest | null>(null)
  const [showBulkNotify, setShowBulkNotify] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'interests', { search, programSlug, ordering, page }],
    queryFn: () => api.getProgramInterests({
      search: search || undefined,
      program_slug: programSlug || undefined,
      ordering, page, page_size: PAGE_SIZE,
    } as never),
    placeholderData: (p) => p,
  })

  const items: ProgramInterest[] = data?.results ?? []
  const total = data?.count ?? 0
  const programCounts: { program_slug: string; program_name: string; count: number }[] = data?.program_counts ?? []
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const programOptions = [
    { value: '', label: 'All Programs' },
    ...programCounts.map((p) => ({ value: p.program_slug, label: `${p.program_name || p.program_slug} (${p.count})` })),
  ]

  const filteredProgram = programCounts.find((p) => p.program_slug === programSlug)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 h-9 rounded-xl" placeholder="Search name or email…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-52">
          <Select value={programSlug} onChange={(v) => { setProgramSlug(v); setPage(1); setShowBulkNotify(false) }} options={programOptions} />
        </div>
        <div className="w-44">
          <Select value={ordering} onChange={setOrdering} options={[
            { value: '-created_at', label: 'Newest first' },
            { value: 'created_at',  label: 'Oldest first' },
            { value: 'name',        label: 'Name A–Z' },
          ]} />
        </div>
        {programSlug && total > 0 && (
          <Button size="sm" variant="outline" onClick={() => setShowBulkNotify((v) => !v)}>
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            Notify {total} interested
          </Button>
        )}
      </div>

      {showBulkNotify && programSlug && (
        <NotifyForm
          programSlug={programSlug}
          programName={filteredProgram?.program_name ?? programSlug}
          onDone={() => setShowBulkNotify(false)}
        />
      )}

      <p className="text-sm text-muted-foreground mt-1">{isLoading ? 'Loading…' : `${total} submission${total !== 1 ? 's' : ''}`}</p>

      {isLoading ? (
        <div className="space-y-2 mt-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <Flame className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No interest submissions yet.</p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} onClick={() => setSelected(item)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group">
              <Avatar name={item.name} email={item.email} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.name || <span className="text-muted-foreground italic">Anonymous</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{item.email}
                  {item.program_name && <span className="mx-1.5 opacity-40">·</span>}
                  {item.program_name}
                </p>
              </div>
              {item.phone && (
                <Phone className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />
              )}
              <p className="text-xs text-muted-foreground hidden sm:block shrink-0">{formatDate(item.created_at)}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}

      {selected && (
        <InterestDetailDialog
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ─── Tab 2: Help me / Don't know ─────────────────────────────────────────────

function HelpMeTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<HelpMeLead | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'help-me', { search, page }],
    queryFn: () => api.getHelpMeLeads({ search: search || undefined, page, page_size: PAGE_SIZE } as never),
    placeholderData: (p) => p,
  })

  const items: HelpMeLead[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function whatsappUrl(phone?: string) {
    if (!phone) return null
    const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
    return `https://wa.me/${digits}`
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-9 h-9 rounded-xl" placeholder="Search name or email…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <p className="text-sm text-muted-foreground mt-1">
        {isLoading ? 'Loading…' : `${total} lead${total !== 1 ? 's' : ''}`}
      </p>

      {isLoading ? (
        <div className="space-y-2 mt-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No guidance requests yet.</p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} onClick={() => setSelected(item)}
              className="flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group">
              <Avatar name={item.name} email={item.email} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">
                    {item.name || <span className="text-muted-foreground italic">No name</span>}
                  </p>
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />{item.email}
                  </span>
                  {item.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />{item.phone}
                    </span>
                  )}
                </div>
                {item.message && (
                  <p className="text-xs text-muted-foreground/70 truncate italic">
                    "{item.message}"
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-md">
          <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">
                  {(selected.name || selected.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base truncate">
                  {selected.name || <span className="text-muted-foreground italic">No name</span>}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" /> Submitted {formatDate(selected.created_at)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Contact details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</p>
              <div className="rounded-xl border border-border divide-y divide-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{selected.email}</p>
                  </div>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{selected.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reach out buttons */}
            <div className="grid grid-cols-3 gap-2">
              <a href={`mailto:${selected.email}?subject=Re: Your Nexa Academy Program Inquiry`}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors text-center">
                <Mail className="w-5 h-5 text-primary" />
                Email
              </a>
              {selected.phone ? (
                <a href={`tel:${selected.phone}`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-green-50 hover:border-green-300 transition-colors text-center">
                  <PhoneCall className="w-5 h-5 text-green-600" />
                  Call
                </a>
              ) : (
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
                  <PhoneCall className="w-5 h-5 text-muted-foreground" />
                  Call
                </div>
              )}
              {whatsappUrl(selected.phone) ? (
                <a href={whatsappUrl(selected.phone)!} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-[#25D366]/10 hover:border-[#25D366]/40 transition-colors text-center">
                  <Send className="w-5 h-5 text-[#25D366]" />
                  WhatsApp
                </a>
              ) : (
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
                  <Send className="w-5 h-5 text-muted-foreground" />
                  WhatsApp
                </div>
              )}
            </div>

            {/* Message */}
            {selected.message && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MessageSquare className="w-3.5 h-3.5" /> Their Message
                  </p>
                  <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed">{selected.message}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  )
}

// ─── Tab 3: Incomplete applications ──────────────────────────────────────────

const STEP_LABELS: Record<number, string> = { 1: 'About You', 2: 'Program & Plan', 3: 'Review' }

function IncompleteTab() {
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-updated_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<IncompleteApplication | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'incomplete', { search, ordering, page }],
    queryFn: () => api.getIncompleteApplications({ search: search || undefined, ordering, page, page_size: PAGE_SIZE } as never),
    placeholderData: (p) => p,
  })

  const items: IncompleteApplication[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 h-9 rounded-xl" placeholder="Search name, email or program…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-44">
          <Select value={ordering} onChange={setOrdering} options={[
            { value: '-updated_at', label: 'Recently active' },
            { value: 'updated_at',  label: 'Oldest activity' },
            { value: 'name',        label: 'Name A–Z' },
          ]} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-1">{isLoading ? 'Loading…' : `${total} incomplete form${total !== 1 ? 's' : ''}`}</p>

      {isLoading ? (
        <div className="space-y-2 mt-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <FileWarning className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No incomplete applications yet.</p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} onClick={() => setSelected(item)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group">
              <Avatar name={item.name} email={item.email} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.name || <span className="text-muted-foreground italic">No name</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{item.email}
                  {item.program_name && <span className="mx-1.5 opacity-40">·</span>}
                  {item.program_name}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                  Stopped at: {STEP_LABELS[item.step_reached] ?? `Step ${item.step_reached}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden lg:block shrink-0">{formatDate(item.updated_at)}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}

      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)}
          title={selected.name || 'Incomplete Application'} description={selected.email} className="max-w-md">
          <div className="space-y-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
              Left at: {STEP_LABELS[selected.step_reached] ?? `Step ${selected.step_reached}`}
            </span>
            <div className="divide-y divide-border">
              <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selected.email} />
              <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={selected.phone} />
              <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Program" value={selected.program_name || selected.program_slug} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Last active" value={formatDate(selected.updated_at)} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Started" value={formatDate(selected.created_at)} />
            </div>
            <Separator />
            <a href={`mailto:${selected.email}`}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors">
              <Mail className="w-4 h-4" /> Follow Up
            </a>
          </div>
        </Dialog>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'interests', label: 'Coming Soon',          icon: Flame,       desc: 'Interest in upcoming programs' },
  { id: 'help_me',   label: "Help Me Choose",        icon: HelpCircle,  desc: 'Need guidance on which program' },
  { id: 'incomplete',label: 'Incomplete Forms',      icon: FileWarning, desc: 'Started but did not submit' },
]

export function Leads() {
  const [tab, setTab] = useState<Tab>('interests')
  const current = TABS.find((t) => t.id === tab)!

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage interest submissions, guidance requests, and incomplete applications.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground -mt-2">{current.desc}</p>

        {tab === 'interests'  && <InterestsTab />}
        {tab === 'help_me'    && <HelpMeTab />}
        {tab === 'incomplete' && <IncompleteTab />}
      </div>
    </AdminLayout>
  )
}
