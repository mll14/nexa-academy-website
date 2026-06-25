import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  GraduationCap, UserPlus, Search, ArrowUpDown,
  TrendingUp, Users, ChevronRight, CheckCircle2,
  AlertCircle, XCircle, BookOpen, CalendarDays,
  Wallet, Filter,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { Badge } from '../../components/ui/badge'
import * as api from '../../lib/api'
import type { EnrollmentFilters } from '../../lib/api/programs'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Enrollment, Program } from '../../types'
import { Pagination } from '../../components/ui/pagination'

function fmtKSh(n: number): string {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000)     return `KSh ${(n / 1_000).toFixed(0)}K`
  return `KSh ${n.toLocaleString('en-KE')}`
}

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const SORT_OPTIONS = [
  { value: '-enrollment_date', label: 'Newest first' },
  { value: 'enrollment_date',  label: 'Oldest first' },
  { value: 'student_name',     label: 'Name A–Z' },
  { value: '-amount',          label: 'Highest fee' },
]

function statusConfig(s: string) {
  switch (s) {
    case 'active':    return { cls: 'bg-success/10 text-success border-success/20',               icon: CheckCircle2,  label: 'Active',     dot: 'bg-success' }
    case 'completed': return { cls: 'bg-primary/10 text-primary border-primary/20',               icon: GraduationCap, label: 'Completed',  dot: 'bg-primary' }
    case 'withdrawn': return { cls: 'bg-destructive/10 text-destructive border-destructive/20',   icon: XCircle,       label: 'Withdrawn',  dot: 'bg-destructive' }
    default:          return { cls: 'bg-muted text-muted-foreground border-border',               icon: AlertCircle,   label: s,            dot: 'bg-muted-foreground' }
  }
}

function progressColor(pct: number, status: string) {
  if (status === 'withdrawn') return 'bg-destructive/60'
  if (pct >= 100) return 'bg-success'
  if (pct >= 50)  return 'bg-primary'
  return 'bg-warning'
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Enroll dialog ────────────────────────────────────────────────────────────

const PAYMENT_PLAN_OPTIONS = [
  { value: '',                 label: 'No plan specified' },
  { value: 'One-time Payment', label: 'One-time Payment' },
  { value: '2 Installments',   label: '2 Installments' },
  { value: '3 Installments',   label: '3 Installments' },
]

function EnrollDialog({ open, onClose, programs, onSuccess }: {
  open: boolean
  onClose: () => void
  programs: Program[]
  onSuccess: () => void
}) {
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [programId, setProgramId] = useState('')
  const [paymentPlan, setPaymentPlan] = useState('')

  const selectedProgram = programs.find((p) => p.program_id === programId) ?? null
  const canSubmit = !!(name.trim() && email.trim() && programId)

  const mutation = useMutation({
    mutationFn: () => api.manualEnroll({
      studentName:  name.trim(),
      studentEmail: email.trim(),
      programId,
      paymentPlan:  paymentPlan || undefined,
    }),
    onSuccess: () => {
      toast.success(`${name.trim()} enrolled successfully`)
      onSuccess()
      handleClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleClose = () => {
    setName(''); setEmail(''); setProgramId(''); setPaymentPlan('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Enroll a Student"
      description="Enter the student's details. A student account will be created if one doesn't exist yet."
      className="max-w-lg"
    >
      <div className="space-y-5">

        <div className="space-y-1.5">
          <Label htmlFor="enroll-name">Full Name *</Label>
          <Input
            id="enroll-name"
            placeholder="e.g. Jane Mwangi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="enroll-email">Email Address *</Label>
          <Input
            id="enroll-email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">If this email is already registered, the existing account will be used.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Program *</Label>
          <Select value={programId} onChange={setProgramId} placeholder="Select a program…"
            options={programs.map((p) => ({ value: p.program_id, label: p.name }))}
          />
          {selectedProgram && (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {[selectedProgram.category, selectedProgram.level, selectedProgram.duration].filter(Boolean).join(' · ')}
              </p>
              {selectedProgram.price != null && (
                <p className="text-xs font-medium text-foreground">
                  KSh {Number(selectedProgram.price).toLocaleString('en-KE')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Installment Plan</Label>
          <Select value={paymentPlan} onChange={setPaymentPlan} options={PAYMENT_PLAN_OPTIONS} />
          <p className="text-xs text-muted-foreground">Optional — the student can request a change later from their dashboard.</p>
        </div>

        <div className="bg-muted/40 border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">
            New students will receive an email to create their password and access their dashboard. Payment is made separately via Paystack or recorded by an admin.
          </p>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button className="flex-1" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            <UserPlus className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Enrolling…' : 'Enroll Student'}
          </Button>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EnrolledStudents() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [programId, setProgramId] = useState('all')
  const [ordering,  setOrdering]  = useState('-enrollment_date')
  const [page,      setPage]      = useState(1)
  const [showEnroll, setShowEnroll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'enrollments', { search, status, programId, ordering, page }],
    queryFn: () => api.getEnrollments({
      search:    search || undefined,
      status:    status === 'all' ? undefined : status,
      program:   programId === 'all' ? undefined : programId,
      ordering,
      page,
      page_size: PAGE_SIZE,
    } satisfies EnrollmentFilters),
    placeholderData: (prev) => prev,
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn:  () => api.getPrograms(),
  })

  const enrollments: Enrollment[] = data?.results ?? []
  const total: number             = data?.count ?? 0
  const totalPages                = Math.ceil(total / PAGE_SIZE)
  const stats                     = data?.stats

  const active      = stats?.active      ?? 0
  const completed   = stats?.completed   ?? 0
  const withdrawn   = stats?.withdrawn   ?? 0
  const revenue     = stats?.total_revenue     ?? 0
  const outstanding = stats?.total_outstanding ?? 0

  const programOptions = [
    { value: 'all', label: 'All Programs' },
    ...(programs as Program[]).map((p) => ({ value: p.program_id, label: p.name })),
  ]

  const activeFilters = [
    search && `"${search}"`,
    status !== 'all' && status,
    programId !== 'all' && (programs as Program[]).find(p => p.program_id === programId)?.name,
  ].filter(Boolean)

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Enrolled Students</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} student${total !== 1 ? 's' : ''} enrolled`}
            </p>
          </div>
          <Button onClick={() => setShowEnroll(true)} className="self-start sm:self-auto gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="sm:hidden">Enroll</span>
            <span className="hidden sm:inline">Enroll Student</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total enrolled"
            value={total.toLocaleString()}
            icon={<Users className="w-4 h-4" />}
            iconBg="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active"
            value={String(active)}
            icon={<CheckCircle2 className="w-4 h-4" />}
            iconBg="bg-success/10 text-success"
            sub={completed > 0 ? `${completed} completed` : undefined}
          />
          <StatCard
            label="Withdrawn"
            value={String(withdrawn)}
            icon={<XCircle className="w-4 h-4" />}
            iconBg="bg-destructive/10 text-destructive"
            sub={withdrawn === 0 ? 'None this page' : undefined}
          />
          <StatCard
            label="Revenue collected"
            value={fmtKSh(revenue)}
            icon={<TrendingUp className="w-4 h-4" />}
            iconBg="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            sub={outstanding > 0 ? `${fmtKSh(outstanding)} outstanding` : 'All settled'}
            subColor={outstanding > 0 ? 'text-warning' : 'text-success'}
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 rounded-xl"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="w-full xs:w-auto sm:w-40">
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTIONS} />
            </div>
            <div className="w-full xs:w-auto sm:w-52">
              <Select value={programId} onChange={(v) => { setProgramId(v); setPage(1) }} options={programOptions} />
            </div>
            <div className="w-full xs:w-auto sm:w-40">
              <Select value={ordering} onChange={setOrdering} options={SORT_OPTIONS} icon={<ArrowUpDown className="w-3.5 h-3.5" />} />
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap -mt-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {activeFilters.map((f) => (
              <Badge key={f as string} variant="secondary" className="text-xs font-normal">{f}</Badge>
            ))}
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setSearch(''); setStatus('all'); setProgramId('all'); setPage(1) }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[72px] bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.13 }} />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState hasFilters={activeFilters.length > 0} onClear={() => { setSearch(''); setStatus('all'); setProgramId('all'); setPage(1) }} />
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {enrollments.map((e) => {
              const cfg = statusConfig(e.status)
              const StatusIcon = cfg.icon
              const displayName = e.student_name || e.student_details?.display_name || '?'
              const pct = e.amount > 0 ? Math.min(100, Math.round(((e.amount_paid ?? 0) / e.amount) * 100)) : 0

              return (
                <div
                  key={e.enrollment_id}
                  onClick={() => navigate({ to: '/admin/enrolled/$enrollmentId', params: { enrollmentId: e.enrollment_id } })}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarColor(displayName)}`}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{displayName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" />{cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {e.student_details?.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{e.student_details.email}</p>
                      )}
                      {e.program_name && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{e.program_name}</span>
                        </span>
                      )}
                      {e.enrollment_date && (
                        <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(e.enrollment_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment column */}
                  <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0 min-w-[140px]">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wallet className="w-3 h-3" />
                        {pct}% paid
                      </span>
                      {e.balance > 0 ? (
                        <span className="text-xs font-semibold text-warning">
                          {fmtKSh(e.balance)} due
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-success">Settled</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressColor(pct, e.status)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground w-full text-right">
                      KSh {(e.amount_paid ?? 0).toLocaleString('en-KE')} / {(e.amount ?? 0).toLocaleString('en-KE')}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </div>
              )
            })}
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
      </div>

      <EnrollDialog
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        programs={programs as Program[]}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })}
      />
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, iconBg, sub, subColor = 'text-muted-foreground',
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  sub?: string
  subColor?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold font-heading mt-0.5 leading-tight">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="py-20 text-center border border-dashed border-border rounded-2xl space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
        <GraduationCap className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? 'No students match these filters' : 'No enrolled students yet'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {hasFilters ? 'Try adjusting your search or filter criteria.' : 'Use the Enroll Student button to add the first student.'}
        </p>
      </div>
      {hasFilters && (
        <button onClick={onClear} className="text-xs text-primary hover:underline">
          Clear filters
        </button>
      )}
    </div>
  )
}
