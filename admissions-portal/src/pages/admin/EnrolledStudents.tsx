import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap, UserPlus, Search,
  ArrowUpDown, Mail, Phone, BookOpen, Calendar,
  TrendingUp, Users, ChevronRight,
  CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Enrollment, Program, User } from '../../types'

const PAGE_SIZE = 20

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

function enrollmentStatusConfig(s: string) {
  switch (s) {
    case 'active':    return { cls: 'bg-success/10 text-success border-success/20',         icon: CheckCircle2, label: 'Active' }
    case 'completed': return { cls: 'bg-primary/10 text-primary border-primary/20',          icon: GraduationCap, label: 'Completed' }
    case 'withdrawn': return { cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Withdrawn' }
    default:          return { cls: 'bg-muted text-muted-foreground border-border',          icon: AlertCircle,  label: s }
  }
}


function BalanceBar({ amount, amountPaid }: { amount: number; amountPaid: number }) {
  const pct = amount > 0 ? Math.min(100, Math.round((amountPaid / amount) * 100)) : 0
  const balanced = amountPaid >= amount
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Payment progress</span>
        <span className={`font-semibold ${balanced ? 'text-success' : 'text-warning'}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${balanced ? 'bg-success' : 'bg-warning'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Paid: KSh {amountPaid.toLocaleString('en-KE')}</span>
        <span>Total: KSh {amount.toLocaleString('en-KE')}</span>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{value}</span>
      </div>
    </div>
  )
}

// ─── Student picker: search existing OR enter manually ───────────────────────

type StudentValue = { uid?: string; email: string; display_name: string }

function StudentPicker({ value, onChange }: {
  value: StudentValue | null
  onChange: (v: StudentValue | null) => void
}) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen]         = useState(false)
  const [manual, setManual]     = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync manual fields → parent value
  useEffect(() => {
    if (!manual) return
    if (manualName || manualEmail) {
      onChange({ display_name: manualName, email: manualEmail })
    } else {
      onChange(null)
    }
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
        setOpen(true) // always open so "not found" hint is visible
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

  const switchToManual = () => {
    setOpen(false)
    setManual(true)
    setQuery('')
    onChange(null)
  }

  const switchToSearch = () => {
    setManual(false)
    setManualName('')
    setManualEmail('')
    onChange(null)
  }

  if (manual) {
    return (
      <div className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Enter student details manually</span>
          <button type="button" onClick={switchToSearch} className="text-xs text-primary hover:underline">
            Search instead
          </button>
        </div>
        <Input
          placeholder="Full name *"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          className="h-9 rounded-xl"
        />
        <Input
          type="email"
          placeholder="Email address *"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          className="h-9 rounded-xl"
        />
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
            <button
              key={u.uid}
              type="button"
              onClick={() => pick(u)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{(u.display_name || u.email).charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={switchToManual}
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

// ─── Manual enrollment dialog ─────────────────────────────────────────────────

function EnrollDialog({ open, onClose, programs, onSuccess }: {
  open: boolean
  onClose: () => void
  programs: Program[]
  onSuccess: () => void
}) {
  const [student, setStudent] = useState<StudentValue | null>(null)
  const [programId, setProgramId] = useState('')
  const [amount, setAmount] = useState('')
  const [amountPaid, setAmountPaid] = useState('')

  const selectedProgram = programs.find((p) => p.program_id === programId) ?? null
  const balance = (parseFloat(amount) || 0) - (parseFloat(amountPaid) || 0)
  const canSubmit = !!(student?.email && student?.display_name && programId && parseFloat(amount) > 0)

  const mutation = useMutation({
    mutationFn: () => api.manualEnroll({
      studentId: student!.uid ?? '',
      studentName: student!.display_name,
      studentEmail: student!.email,
      programId,
      amount: parseFloat(amount),
      amountPaid: parseFloat(amountPaid) || 0,
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
    <Dialog
      open={open}
      onClose={handleClose}
      title="Enroll a Student"
      description="Search for an existing student or enter their details manually."
      className="max-w-lg"
    >
      <div className="space-y-5">

        {/* Student picker */}
        <div className="space-y-1.5">
          <Label>Student *</Label>
          <StudentPicker value={student} onChange={setStudent} />
        </div>

        {/* Program */}
        <div className="space-y-1.5">
          <Label>Program *</Label>
          <Select
            value={programId}
            onChange={handleProgramChange}
            placeholder="Select a program…"
            options={programs.map((p) => ({ value: p.program_id, label: p.name }))}
          />
          {selectedProgram && (
            <p className="text-xs text-muted-foreground">
              {[selectedProgram.category, selectedProgram.level, selectedProgram.duration].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Total fee */}
          <div className="space-y-1.5">
            <Label>Total Fee (KSh) *</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {selectedProgram?.price != null && (
              <p className="text-xs text-muted-foreground">
                Suggested: KSh {Number(selectedProgram.price).toLocaleString('en-KE')}
              </p>
            )}
          </div>

          {/* Amount paid */}
          <div className="space-y-1.5">
            <Label>Amount Paid (KSh)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>
        </div>

        {/* Balance preview */}
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
          <Button
            className="flex-1"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
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
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [programId, setProgramId] = useState('all')
  const [ordering, setOrdering] = useState('-enrollment_date')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [showEnroll, setShowEnroll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'enrollments', { search, status, programId, ordering, page }],
    queryFn: () =>
      api.getEnrollments({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        program: programId === 'all' ? undefined : programId,
        ordering,
        page,
        page_size: PAGE_SIZE,
      } as never),
    placeholderData: (prev) => prev,
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => api.getPrograms(),
  })

  const enrollments: Enrollment[] = (data as { results?: Enrollment[] })?.results ?? []
  const total: number             = (data as { count?: number })?.count ?? 0
  const totalPages                = Math.ceil(total / PAGE_SIZE)

  // Stats from current page
  const active    = enrollments.filter((e) => e.status === 'active').length
  const completed = enrollments.filter((e) => e.status === 'completed').length
  const revenue   = enrollments.reduce((s, e) => s + (e.amount_paid ?? 0), 0)
  const balance   = enrollments.reduce((s, e) => s + (e.balance ?? 0), 0)

  const programOptions = [
    { value: 'all', label: 'All Programs' },
    ...(programs as Program[]).map((p) => ({ value: p.program_id, label: p.name })),
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Enrolled Students</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${total} enrollment${total !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <Button onClick={() => setShowEnroll(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Enroll Student
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total enrolled', value: String(total), icon: <Users className="w-5 h-5" /> },
            { label: 'Active',         value: String(active), icon: <CheckCircle2 className="w-5 h-5" /> },
            { label: 'Completed',      value: String(completed), icon: <GraduationCap className="w-5 h-5" /> },
            { label: 'Revenue paid',   value: `KSh ${revenue.toLocaleString('en-KE')}`, icon: <TrendingUp className="w-5 h-5" />, sub: balance > 0 ? `KSh ${balance.toLocaleString('en-KE')} outstanding` : 'All paid up' },
          ].map(({ label, value, icon, sub }) => (
            <div key={label} className="bg-card border border-border rounded-2xl px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">{icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-xl font-bold font-heading mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 rounded-xl"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex gap-2.5">
            <div className="w-44">
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTIONS} />
            </div>
            <div className="w-52">
              <Select value={programId} onChange={(v) => { setProgramId(v); setPage(1) }} options={programOptions} />
            </div>
            <div className="w-44">
              <Select value={ordering} onChange={setOrdering} options={SORT_OPTIONS} icon={<ArrowUpDown className="w-3.5 h-3.5" />} />
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl">
            <GraduationCap className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No enrolled students match your filters.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {enrollments.map((e) => {
              const cfg = enrollmentStatusConfig(e.status)
              const StatusIcon = cfg.icon
              const pct = e.amount > 0 ? Math.min(100, Math.round(((e.amount_paid ?? 0) / e.amount) * 100)) : 0
              return (
                <div
                  key={e.enrollment_id}
                  onClick={() => setSelected(e)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(e.student_name || e.student_details?.display_name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{e.student_name || e.student_details?.display_name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" />{cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {e.student_details?.email}
                      {e.program_name && <span className="mx-1.5 opacity-40">·</span>}
                      {e.program_name}
                    </p>
                  </div>

                  {/* Payment progress */}
                  <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-36">
                    <div className="flex justify-between w-full text-xs">
                      <span className="text-muted-foreground">{pct}% paid</span>
                      {e.balance > 0 && <span className="text-warning font-medium">KSh {e.balance.toLocaleString('en-KE')} due</span>}
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-warning'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="hidden sm:block shrink-0 text-right">
                    <p className="text-xs font-medium">KSh {(e.amount_paid ?? 0).toLocaleString('en-KE')}</p>
                    <p className="text-xs text-muted-foreground">{e.enrollment_date ? formatDate(e.enrollment_date) : '—'}</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selected && (() => {
        const cfg = enrollmentStatusConfig(selected.status)
        const StatusIcon = cfg.icon
        const email = selected.student_details?.email
        const phone = selected.student_details?.phone
        return (
          <Dialog
            open={!!selected}
            onClose={() => setSelected(null)}
            title={selected.student_name || selected.student_details?.display_name || 'Student'}
            description={email}
            className="max-w-lg"
          >
            <div className="space-y-5">
              {/* Status */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
              </span>

              {/* Student info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Student</p>
                <div className="divide-y divide-border">
                  {email && <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={email} />}
                  {phone && <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={phone} />}
                  <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Program" value={selected.program_name} />
                  <DetailRow icon={<Calendar className="w-4 h-4" />} label="Enrolled" value={selected.enrollment_date ? formatDate(selected.enrollment_date) : undefined} />
                  {selected.start_date && <DetailRow icon={<Calendar className="w-4 h-4" />} label="Start date" value={formatDate(selected.start_date)} />}
                  {selected.end_date && <DetailRow icon={<Calendar className="w-4 h-4" />} label="End date" value={formatDate(selected.end_date)} />}
                </div>
              </div>

              <Separator />

              {/* Fee breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">Fees</p>
                <BalanceBar amount={selected.amount} amountPaid={selected.amount_paid ?? 0} />
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total fee',  value: `KSh ${selected.amount.toLocaleString('en-KE')}` },
                    { label: 'Paid',       value: `KSh ${(selected.amount_paid ?? 0).toLocaleString('en-KE')}`, green: true },
                    { label: 'Balance',    value: `KSh ${(selected.balance ?? 0).toLocaleString('en-KE')}`, warn: (selected.balance ?? 0) > 0 },
                  ].map(({ label, value, green, warn }) => (
                    <div key={label} className="bg-muted/40 rounded-xl px-3 py-2.5 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${green ? 'text-success' : warn ? 'text-warning' : ''}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Dialog>
        )
      })()}

      {/* Enroll dialog */}
      <EnrollDialog
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        programs={programs as Program[]}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })}
      />
    </AdminLayout>
  )
}
