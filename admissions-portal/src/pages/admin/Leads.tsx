import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Flame, HelpCircle, FileWarning, Search,
  Mail, Phone, ChevronRight, Bell,
  CheckCircle2, RotateCcw, Clock,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { ProgramInterest, HelpMeLead, IncompleteApplication } from '../../types'

const PAGE_SIZE = 20

type Tab = 'interests' | 'help_me' | 'incomplete'
type FollowUpFilter = 'pending' | 'done'

function Avatar({ name, email }: { name?: string; email: string }) {
  const initials = (name || email).charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{initials}</span>
    </div>
  )
}

// ─── Follow-up status sub-tabs ────────────────────────────────────────────────

function FollowUpTabs({ value, onChange, pendingCount, doneCount }: {
  value: FollowUpFilter
  onChange: (v: FollowUpFilter) => void
  pendingCount?: number
  doneCount?: number
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
      {([
        { id: 'pending' as FollowUpFilter, label: 'Needs Follow-up', icon: Clock, count: pendingCount },
        { id: 'done'    as FollowUpFilter, label: 'Completed',        icon: CheckCircle2, count: doneCount },
      ]).map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === id
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
          {count !== undefined && (
            <span className={`ml-0.5 min-w-[1.25rem] px-1 rounded-full text-xs font-bold tabular-nums ${
              value === id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Mark / revert button ─────────────────────────────────────────────────────

function FollowUpBtn({ completed, onMark, onRevert, loading }: {
  completed: boolean
  onMark: () => void
  onRevert: () => void
  loading: boolean
}) {
  if (completed) {
    return (
      <button
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onRevert() }}
        title="Undo — mark as needing follow-up"
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:border-warning hover:text-warning transition-colors disabled:opacity-40 shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Undo
      </button>
    )
  }
  return (
    <button
      disabled={loading}
      onClick={(e) => { e.stopPropagation(); onMark() }}
      title="Mark follow-up as completed"
      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:border-success hover:text-success transition-colors disabled:opacity-40 shrink-0"
    >
      <CheckCircle2 className="w-3 h-3" />
      Done
    </button>
  )
}

// ─── Notify form ──────────────────────────────────────────────────────────────

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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Application deadline</Label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <Button size="sm" className="w-full" disabled={!startDate || mutation.isPending} onClick={() => mutation.mutate()}>
        <Bell className="w-3.5 h-3.5 mr-1.5" />
        {mutation.isPending ? 'Sending…' : ids?.length ? 'Send Notification' : `Notify All for ${programName || programSlug}`}
      </Button>
    </div>
  )
}

// ─── Tab 1: Coming-soon interests ─────────────────────────────────────────────

function InterestsTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [followUp, setFollowUp] = useState<FollowUpFilter>('pending')
  const [search, setSearch] = useState('')
  const [programSlug, setProgramSlug] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [showBulkNotify, setShowBulkNotify] = useState(false)

  const params = {
    search: search || undefined,
    program_slug: programSlug || undefined,
    follow_up_completed: followUp === 'done' ? 'true' : 'false',
    ordering,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'interests', params],
    queryFn: () => api.getProgramInterests(params as never),
    placeholderData: (p) => p,
  })

  const items: ProgramInterest[] = data?.results ?? []
  const total = data?.count ?? 0
  const programCounts: { program_slug: string; program_name: string; count: number }[] = data?.program_counts ?? []
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const filteredProgram = programCounts.find((p) => p.program_slug === programSlug)

  const programOptions = [
    { value: '', label: 'All Programs' },
    ...programCounts.map((p) => ({ value: p.program_slug, label: `${p.program_name || p.program_slug} (${p.count})` })),
  ]

  const markMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'revert' }) =>
      action === 'complete' ? api.markLeadCompleted('interests', id) : api.revertLeadCompleted('interests', id),
    onSuccess: (_, { action }) => {
      toast.success(action === 'complete' ? 'Marked as completed' : 'Reverted to needs follow-up')
      qc.invalidateQueries({ queryKey: ['admin', 'interests'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  return (
    <>
      <FollowUpTabs value={followUp} onChange={(v) => { setFollowUp(v); setPage(1) }} />

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
        {programSlug && total > 0 && followUp === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => setShowBulkNotify((v) => !v)}>
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify {total} interested
          </Button>
        )}
      </div>

      {showBulkNotify && programSlug && (
        <NotifyForm programSlug={programSlug} programName={filteredProgram?.program_name ?? programSlug}
          onDone={() => setShowBulkNotify(false)} />
      )}

      <p className="text-sm text-muted-foreground mt-1">{isLoading ? 'Loading…' : `${total} submission${total !== 1 ? 's' : ''}`}</p>

      {isLoading ? (
        <div className="space-y-2 mt-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <Flame className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {followUp === 'done' ? 'No completed follow-ups yet.' : 'No interest submissions yet.'}
          </p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id}
              onClick={() => navigate({ to: '/admin/leads/$leadType/$id', params: { leadType: 'interests', id: item.id } })}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group">
              <Avatar name={item.name} email={item.email} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.name || <span className="text-muted-foreground italic">Anonymous</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{item.email}
                  {item.program_name && <span className="mx-1.5 opacity-40">·</span>}
                  {item.program_name}
                </p>
              </div>
              {item.phone && <Phone className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />}
              <p className="text-xs text-muted-foreground hidden sm:block shrink-0">{formatDate(item.created_at)}</p>
              <FollowUpBtn
                completed={item.follow_up_completed}
                loading={markMutation.isPending}
                onMark={() => markMutation.mutate({ id: item.id, action: 'complete' })}
                onRevert={() => markMutation.mutate({ id: item.id, action: 'revert' })}
              />
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
    </>
  )
}

// ─── Tab 2: Help me / Don't know ──────────────────────────────────────────────

function HelpMeTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [followUp, setFollowUp] = useState<FollowUpFilter>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = {
    search: search || undefined,
    follow_up_completed: followUp === 'done' ? 'true' : 'false',
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'help-me', params],
    queryFn: () => api.getHelpMeLeads(params as never),
    placeholderData: (p) => p,
  })

  const items: HelpMeLead[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const markMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'revert' }) =>
      action === 'complete' ? api.markLeadCompleted('help-me', id) : api.revertLeadCompleted('help-me', id),
    onSuccess: (_, { action }) => {
      toast.success(action === 'complete' ? 'Marked as completed' : 'Reverted to needs follow-up')
      qc.invalidateQueries({ queryKey: ['admin', 'help-me'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  return (
    <>
      <FollowUpTabs value={followUp} onChange={(v) => { setFollowUp(v); setPage(1) }} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-9 h-9 rounded-xl" placeholder="Search name or email…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <p className="text-sm text-muted-foreground mt-1">{isLoading ? 'Loading…' : `${total} lead${total !== 1 ? 's' : ''}`}</p>

      {isLoading ? (
        <div className="space-y-2 mt-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {followUp === 'done' ? 'No completed follow-ups yet.' : 'No guidance requests yet.'}
          </p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id}
              onClick={() => navigate({ to: '/admin/leads/$leadType/$id', params: { leadType: 'help-me', id: item.id } })}
              className="flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group">
              <Avatar name={item.name} email={item.email} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{item.name || <span className="text-muted-foreground italic">No name</span>}</p>
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">{formatDate(item.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{item.email}</span>
                  {item.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{item.phone}</span>}
                </div>
                {item.message && <p className="text-xs text-muted-foreground/70 truncate italic">"{item.message}"</p>}
              </div>
              <FollowUpBtn
                completed={item.follow_up_completed}
                loading={markMutation.isPending}
                onMark={() => markMutation.mutate({ id: item.id, action: 'complete' })}
                onRevert={() => markMutation.mutate({ id: item.id, action: 'revert' })}
              />
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
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Tab 3: Incomplete applications ───────────────────────────────────────────

const STEP_LABELS: Record<number, string> = { 1: 'About You', 2: 'Program & Plan', 3: 'Review' }

function IncompleteTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [followUp, setFollowUp] = useState<FollowUpFilter>('pending')
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-updated_at')
  const [page, setPage] = useState(1)

  const params = {
    search: search || undefined,
    follow_up_completed: followUp === 'done' ? 'true' : 'false',
    ordering,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'incomplete', params],
    queryFn: () => api.getIncompleteApplications(params as never),
    placeholderData: (p) => p,
  })

  const items: IncompleteApplication[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const markMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'revert' }) =>
      action === 'complete' ? api.markLeadCompleted('incomplete', id) : api.revertLeadCompleted('incomplete', id),
    onSuccess: (_, { action }) => {
      toast.success(action === 'complete' ? 'Marked as completed' : 'Reverted to needs follow-up')
      qc.invalidateQueries({ queryKey: ['admin', 'incomplete'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  return (
    <>
      <FollowUpTabs value={followUp} onChange={(v) => { setFollowUp(v); setPage(1) }} />

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
          <p className="text-sm text-muted-foreground">
            {followUp === 'done' ? 'No completed follow-ups yet.' : 'No incomplete applications yet.'}
          </p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id}
              onClick={() => navigate({ to: '/admin/leads/$leadType/$id', params: { leadType: 'incomplete', id: item.id } })}
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
              <FollowUpBtn
                completed={item.follow_up_completed}
                loading={markMutation.isPending}
                onMark={() => markMutation.mutate({ id: item.id, action: 'complete' })}
                onRevert={() => markMutation.mutate({ id: item.id, action: 'revert' })}
              />
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
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'interests',  label: 'Coming Soon',     icon: Flame,       desc: 'Interest in upcoming programs' },
  { id: 'help_me',    label: 'Help Me Choose',   icon: HelpCircle,  desc: 'Need guidance on which program' },
  { id: 'incomplete', label: 'Incomplete Forms', icon: FileWarning, desc: 'Started but did not submit' },
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
