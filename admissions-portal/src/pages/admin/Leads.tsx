import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Flame, HelpCircle, FileWarning, Search,
  Mail, Phone, ChevronRight, Bell,
  CheckCircle2, Clock, Trash2, Send, Tag, PhoneOff,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { ProgramInterest, HelpMeLead, IncompleteApplication, LeadStatus } from '../../types'
import { DeleteConfirmDialog } from '../../components/ui/delete-confirm-dialog'
import { Pagination } from '../../components/ui/pagination'

const PAGE_SIZE = 10

type Tab = 'interests' | 'help_me' | 'incomplete'
type LeadStatusFilter = 'all' | LeadStatus

const LEAD_STATUS_OPTIONS: {
  value: LeadStatus
  label: string
  icon: React.ElementType
  className: string
}[] = [
  { value: 'new', label: 'New', icon: Clock, className: 'bg-muted text-muted-foreground border-border' },
  { value: 'contacted', label: 'Contacted', icon: Phone, className: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'not_reached', label: 'Not Reached', icon: PhoneOff, className: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
]

const LEAD_STATUS_SELECT_OPTIONS = LEAD_STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))

function leadStatus(item: { lead_status?: LeadStatus; follow_up_completed: boolean }): LeadStatus {
  return item.lead_status ?? (item.follow_up_completed ? 'completed' : 'new')
}

function leadStatusMeta(status: LeadStatus) {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status) ?? LEAD_STATUS_OPTIONS[0]
}

function Avatar({ name, email }: { name?: string; email: string }) {
  const initials = (name || email).charAt(0).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{initials}</span>
    </div>
  )
}

// ─── Lead status tags ─────────────────────────────────────────────────────────

function LeadStatusTabs({ value, onChange }: {
  value: LeadStatusFilter
  onChange: (v: LeadStatusFilter) => void
}) {
  const tabs = [
    { id: 'all' as LeadStatusFilter, label: 'All', icon: Tag },
    ...LEAD_STATUS_OPTIONS.map((option) => ({ id: option.value as LeadStatusFilter, label: option.label, icon: option.icon })),
  ]

  return (
    <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-xl w-fit">
      {tabs.map(({ id, label, icon: Icon }) => (
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
        </button>
      ))}
    </div>
  )
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = leadStatusMeta(status)
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${meta.className}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}

function LeadStatusSelect({ value, loading, onChange }: {
  value: LeadStatus
  loading: boolean
  onChange: (status: LeadStatus) => void
}) {
  return (
    <div
      className="w-36 shrink-0"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Select
        value={value}
        onChange={(next) => onChange(next as LeadStatus)}
        options={LEAD_STATUS_SELECT_OPTIONS}
        disabled={loading}
        icon={<Tag className="w-3.5 h-3.5" />}
        className="h-8 rounded-lg text-xs"
      />
    </div>
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
  const { isFullAdmin } = useAuth()
  const canDelete = isFullAdmin()
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [programSlug, setProgramSlug] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [showBulkNotify, setShowBulkNotify] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProgramInterest | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const params = {
    search: search || undefined,
    program_slug: programSlug || undefined,
    lead_status: statusFilter === 'all' ? undefined : statusFilter,
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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.updateLeadStatus('interests', id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Lead tagged as ${leadStatusMeta(status).label}`)
      qc.invalidateQueries({ queryKey: ['admin', 'interests'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  return (
    <>
      <LeadStatusTabs value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} />

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
        {programSlug && total > 0 && statusFilter !== 'completed' && (
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
            {statusFilter === 'all' ? 'No interest submissions yet.' : `No ${leadStatusMeta(statusFilter).label.toLowerCase()} interest submissions yet.`}
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
              <LeadStatusBadge status={leadStatus(item)} />
              {item.phone && <Phone className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />}
              <p className="text-xs text-muted-foreground hidden sm:block shrink-0">{formatDate(item.created_at)}</p>
              <LeadStatusSelect
                value={leadStatus(item)}
                loading={statusMutation.isPending}
                onChange={(status) => statusMutation.mutate({ id: item.id, status })}
              />
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteLoading(true)
          try {
            await api.deleteProgramInterestLead(deleteTarget.id)
            qc.invalidateQueries({ queryKey: ['admin', 'interests'] })
            toast.success('Lead deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed.')
          } finally {
            setDeleteLoading(false)
          }
        }}
        title="Delete Lead"
        itemName={deleteTarget ? (deleteTarget.name || deleteTarget.email) : ''}
        consequences="This lead record will be permanently removed. Any follow-up history and program interest data will be lost. This cannot be undone."
        isPending={deleteLoading}
      />
    </>
  )
}

// ─── Tab 2: Help me / Don't know ──────────────────────────────────────────────

function HelpMeTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isFullAdmin } = useAuth()
  const canDelete = isFullAdmin()
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<HelpMeLead | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pipelineLeadId, setPipelineLeadId] = useState<string | null>(null)
  const [pipelineProgramSlug, setPipelineProgramSlug] = useState('')

  const params = {
    search: search || undefined,
    lead_status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'help-me', params],
    queryFn: () => api.getHelpMeLeads(params as never),
    placeholderData: (p) => p,
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => api.getPrograms(),
    staleTime: 5 * 60 * 1000,
  })

  const items: HelpMeLead[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.updateLeadStatus('help-me', id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Lead tagged as ${leadStatusMeta(status).label}`)
      qc.invalidateQueries({ queryKey: ['admin', 'help-me'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  const pipelineMutation = useMutation({
    mutationFn: ({ id, slug, name }: { id: string; slug: string; name: string }) =>
      api.convertHelpMeToPipeline(id, slug, name),
    onSuccess: (_, { name }) => {
      toast.success(`Pipeline email sent for ${name}`)
      setPipelineLeadId(null)
      setPipelineProgramSlug('')
      qc.invalidateQueries({ queryKey: ['admin', 'help-me'] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send pipeline email'),
  })

  const programOptions = [
    { value: '', label: 'Select a program…' },
    ...programs
      .filter((p) => !p.coming_soon)
      .map((p) => ({ value: p.slug, label: p.name })),
  ]

  const openPipelinePanel = (e: React.MouseEvent, id: string, currentSlug: string) => {
    e.stopPropagation()
    setPipelineLeadId(pipelineLeadId === id ? null : id)
    setPipelineProgramSlug(currentSlug)
  }

  return (
    <>
      <LeadStatusTabs value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} />

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
            {statusFilter === 'all' ? 'No guidance requests yet.' : `No ${leadStatusMeta(statusFilter).label.toLowerCase()} guidance requests yet.`}
          </p>
        </div>
      ) : (
        <div className="mt-3 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {items.map((item) => (
            <div key={item.id}>
              <div
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
                  {item.converted_to_pipeline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="w-3 h-3" />
                      In Pipeline · {item.assigned_program_name}
                    </span>
                  )}
                  <LeadStatusBadge status={leadStatus(item)} />
                </div>
                <button
                  onClick={(e) => openPipelinePanel(e, item.id, item.assigned_program_slug)}
                  title={item.converted_to_pipeline ? 'Reassign to pipeline' : 'Send to application pipeline'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors shrink-0 opacity-0 group-hover:opacity-100 ${
                    item.converted_to_pipeline
                      ? 'border-success/40 text-success hover:border-success hover:bg-success/10'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                  }`}
                >
                  <Send className="w-3 h-3" />
                  {item.converted_to_pipeline ? 'Reassign' : 'Pipeline'}
                </button>
                <LeadStatusSelect
                  value={leadStatus(item)}
                  loading={statusMutation.isPending}
                  onChange={(status) => statusMutation.mutate({ id: item.id, status })}
                />
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0 mt-1" />
              </div>

              {pipelineLeadId === item.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="px-5 py-4 bg-primary/5 border-t border-primary/10 space-y-3"
                >
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    {item.converted_to_pipeline ? 'Reassign to a different program' : 'Add to application pipeline'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select the program, then click <strong>Send Pipeline Email</strong>. An email will be sent to <strong>{item.email}</strong> with a direct link to apply.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    <div className="flex-1">
                      <Select
                        value={pipelineProgramSlug}
                        onChange={setPipelineProgramSlug}
                        options={programOptions}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!pipelineProgramSlug || pipelineMutation.isPending}
                      onClick={() => {
                        const prog = programs.find((p) => p.slug === pipelineProgramSlug)
                        if (!prog) return
                        pipelineMutation.mutate({ id: item.id, slug: prog.slug, name: prog.name })
                      }}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {pipelineMutation.isPending ? 'Sending…' : 'Send Pipeline Email'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setPipelineLeadId(null); setPipelineProgramSlug('') }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteLoading(true)
          try {
            await api.deleteHelpMeLead(deleteTarget.id)
            qc.invalidateQueries({ queryKey: ['admin', 'help-me'] })
            toast.success('Lead deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed.')
          } finally {
            setDeleteLoading(false)
          }
        }}
        title="Delete Lead"
        itemName={deleteTarget ? (deleteTarget.name || deleteTarget.email) : ''}
        consequences="This lead record will be permanently removed. Any follow-up history and guidance request data will be lost. This cannot be undone."
        isPending={deleteLoading}
      />
    </>
  )
}

// ─── Tab 3: Incomplete applications ───────────────────────────────────────────

const STEP_LABELS: Record<number, string> = { 1: 'About You', 2: 'Program & Plan', 3: 'Review' }

function IncompleteTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isFullAdmin } = useAuth()
  const canDelete = isFullAdmin()
  const [deleteTarget, setDeleteTarget] = useState<IncompleteApplication | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-updated_at')
  const [page, setPage] = useState(1)

  const params = {
    search: search || undefined,
    lead_status: statusFilter === 'all' ? undefined : statusFilter,
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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.updateLeadStatus('incomplete', id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Lead tagged as ${leadStatusMeta(status).label}`)
      qc.invalidateQueries({ queryKey: ['admin', 'incomplete'] })
    },
    onError: () => toast.error('Could not update status'),
  })

  return (
    <>
      <LeadStatusTabs value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} />

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
            {statusFilter === 'all' ? 'No incomplete applications yet.' : `No ${leadStatusMeta(statusFilter).label.toLowerCase()} incomplete applications yet.`}
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
              <LeadStatusBadge status={leadStatus(item)} />
              <p className="text-xs text-muted-foreground hidden lg:block shrink-0">{formatDate(item.updated_at)}</p>
              <LeadStatusSelect
                value={leadStatus(item)}
                loading={statusMutation.isPending}
                onChange={(status) => statusMutation.mutate({ id: item.id, status })}
              />
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteLoading(true)
          try {
            await api.deleteIncompleteLead(deleteTarget.id)
            qc.invalidateQueries({ queryKey: ['admin', 'incomplete'] })
            toast.success('Lead deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed.')
          } finally {
            setDeleteLoading(false)
          }
        }}
        title="Delete Incomplete Lead"
        itemName={deleteTarget ? (deleteTarget.name || deleteTarget.email) : ''}
        consequences="This incomplete application record will be permanently removed. Any partial form data and follow-up history will be lost. This cannot be undone."
        isPending={deleteLoading}
      />
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'incomplete', label: 'Incomplete Forms', icon: FileWarning, desc: 'Started but did not submit' },
  { id: 'help_me',    label: 'Help Me Choose',   icon: HelpCircle,  desc: 'Need guidance on which program' },
  { id: 'interests',  label: 'Coming Soon',       icon: Flame,       desc: 'Interest in upcoming programs' },
]

export function Leads() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/admin/leads' }) as { tab?: Tab }
  const tab: Tab = TABS.find((t) => t.id === search.tab)?.id ?? 'incomplete'
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
            <button key={id} onClick={() => navigate({ to: '/admin/leads', search: { tab: id } } as never)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground -mt-2">{current.desc}</p>

        {tab === 'incomplete' && <IncompleteTab />}
        {tab === 'help_me'    && <HelpMeTab />}
        {tab === 'interests'  && <InterestsTab />}
      </div>
    </AdminLayout>
  )
}
