import { useState, useRef, useEffect } from 'react'
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
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Enrollment, Program, User } from '../../types'
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

// ─── Student picker ───────────────────────────────────────────────────────────

type StudentValue = { uid?: string; email: string; display_name: string }

function StudentPicker({ value, onChange }: {
  value: StudentValue | null
  onChange: (v: StudentValue | null) => void
}) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<User[]>([])
  const [searching, setSearching]   = useState(false)
  const [open, setOpen]             = useState(false)
  const [manual, setManual]         = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!manual) return
    if (manualName || manualEmail) onChange({ display_name: manualName, email: manualEmail })
    else onChange(null)
  }, [manual, manualName, manualEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = (q: string) => {
    setQuery(q)
    onChange(null)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.getStudents({ search: q })
        const list = Array.isArray(res) ? res : (res as { results: User[] }).results ?? []
        setResults(list)
        setOpen(true)
      } catch {
        setResults([])
        setOpen(true)
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  const pick = (u: User) => {
    setQuery(u.email)
    setOpen(false)
    onChange({ uid: u.uid, email: u.email, display_name: u.display_name })
  }

  const switchToManual = () => { setOpen(false); setManual(true); setQuery(''); onChange(null) }
  const switchToSearch = () => { setManual(false); setManualName(''); setManualEmail(''); onChange(null) }

  if (manual) {
    return (
      <div className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Enter student details manually</span>
          <button type="button" onClick={switchToSearch} className="text-xs text-primary hover:underline">
            Search instead
          </button>
        </div>
        <Input placeholder="Full name *" value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-9 rounded-xl" />
        <Input type="email" placeholder="Email address *" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="h-9 rounded-xl" />
        {manualName && manualEmail && (
          <p className="text-xs text-success font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to enroll
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 h-9 rounded-xl"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => doSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {results.slice(0, 6).map((u) => (
            <button key={u.uid} type="button" onClick={() => pick(u)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${avatarColor(u.display_name || u.email)}`}>
                {(u.display_name || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </button>
          ))}
          <button type="button" onClick={switchToManual}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-primary hover:bg-muted/50 transition-colors border-t border-border"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {results.length === 0 ? 'No results — enter manually' : 'Enter manually instead'}
          </button>
        </div>
      )}

      {!open && query && value && (
        <p className="mt-1.5 text-xs text-success font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {value.display_name}
        </p>
      )}
      {!open && !query && (
        <button type="button" onClick={switchToManual} className="mt-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          Or enter student details manually →
        </button>
      )}
    </div>
  )
}

// ─── Enroll dialog ────────────────────────────────────────────────────────────

function EnrollDialog({ open, onClose, programs, onSuccess }: {
  open: boolean
  onClose: () => void
  programs: Program[]
  onSuccess: () => void
}) {
  const [student, setStudent]   = useState<StudentValue | null>(null)
  const [programId, setProgramId] = useState('')
  const [amount, setAmount]     = useState('')
  const [amountPaid, setAmountPaid] = useState('')

  const selectedProgram = programs.find((p) => p.program_id === programId) ?? null
  const balance   = (parseFloat(amount) || 0) - (parseFloat(amountPaid) || 0)
  const canSubmit = !!(student?.email && student?.display_name && programId && parseFloat(amount) > 0)

  const mutation = useMutation({
    mutationFn: () => api.manualEnroll({
      studentId:    student!.uid ?? '',
      studentName:  student!.display_name,
      studentEmail: student!.email,
      programId,
      amount:       parseFloat(amount),
      amountPaid:   parseFloat(amountPaid) || 0,
    }),
    onSuccess: () => {
      toast.success(`${student!.display_name} enrolled successfully`)
      onSuccess()
      handleClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleClose = () => {
    setStudent(null); setProgramId(''); setAmount(''); setAmountPaid('')
    onClose()
  }

  const handleProgramChange = (id: string) => {
    setProgramId(id)
    const prog = programs.find((p) => p.program_id === id)
    if (prog?.price != null) setAmount(String(prog.price))
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Enroll a Student"
      description="Search for an existing student or enter their details manually."
      className="max-w-lg"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Student *</Label>
          <StudentPicker value={student} onChange={setStudent} />
        </div>

        <div className="space-y-1.5">
          <Label>Program *</Label>
          <Select value={programId} onChange={handleProgramChange} placeholder="Select a program…"
            options={programs.map((p) => ({ value: p.program_id, label: p.name }))}
          />
          {selectedProgram && (
            <p className="text-xs text-muted-foreground">
              {[selectedProgram.category, selectedProgram.level, selectedProgram.duration].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Total Fee (KSh) *</Label>
            <Input type="number" min="0" placeholder="e.g. 150000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {selectedProgram?.price != null && (
              <p className="text-xs text-muted-foreground">Suggested: KSh {Number(selectedProgram.price).toLocaleString('en-KE')}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Amount Paid (KSh)</Label>
            <Input type="number" min="0" placeholder="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </div>
        </div>

        {amount && (
          <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining balance</span>
              <span className={`font-bold ${balance <= 0 ? 'text-success' : 'text-warning'}`}>
                KSh {Math.max(0, balance).toLocaleString('en-KE')}
              </span>
            </div>
            {balance <= 0 && <p className="text-xs text-success">Fully paid</p>}
          </div>
        )}

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
      search:   search || undefined,
      status:   status === 'all' ? undefined : status,
      program:  programId === 'all' ? undefined : programId,
      ordering,
      page,
      page_size: PAGE_SIZE,
    } as never),
    placeholderData: (prev) => prev,
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn:  () => api.getPrograms(),
  })

  const enrollments: Enrollment[] = (data as { results?: Enrollment[] })?.results ?? []
  const total: number             = (data as { count?: number })?.count ?? 0
  const totalPages                = Math.ceil(total / PAGE_SIZE)

  const active    = enrollments.filter((e) => e.status === 'active').length
  const completed = enrollments.filter((e) => e.status === 'completed').length
  const withdrawn = enrollments.filter((e) => e.status === 'withdrawn').length
  const revenue   = enrollments.reduce((s, e) => s + (e.amount_paid ?? 0), 0)
  const outstanding = enrollments.reduce((s, e) => s + (e.balance ?? 0), 0)

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
