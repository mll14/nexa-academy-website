import { useState, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, Search, ArrowUpDown, X, CreditCard,
  Smartphone, Building2, CheckCircle2, Clock, XCircle,
  RotateCcw, DollarSign, TrendingUp, Users, AlertCircle,
  Calendar, Hash, Phone, Mail, BookOpen,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { UnderlineTabs } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Input } from '../../components/ui/input'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { SendInvoiceButton } from '../../components/SendInvoiceButton'
import * as api from '../../lib/api'
import { formatDate, formatFullDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Payment, PaymentPlanChangeRequest, ManualPaymentRequest } from '../../types'
import { Pagination } from '../../components/ui/pagination'

// ─── Transactions tab ────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const TX_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'M-Pesa', label: 'M-Pesa' },
  { value: 'Card', label: 'Card' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
]

const SORT_OPTIONS = [
  { value: '-payment_date', label: 'Newest first' },
  { value: 'payment_date', label: 'Oldest first' },
  { value: '-amount', label: 'Highest amount' },
  { value: 'amount', label: 'Lowest amount' },
]

function txStatusConfig(status: string) {
  switch (status) {
    case 'completed':  return { icon: CheckCircle2, cls: 'bg-success/10 text-success border-success/20',                       dot: 'bg-success' }
    case 'pending':    return { icon: Clock,         cls: 'bg-warning/10 text-warning border-warning/20',                       dot: 'bg-warning' }
    case 'processing': return { icon: RefreshCw,     cls: 'bg-primary/10 text-primary border-primary/20',                       dot: 'bg-primary' }
    case 'failed':     return { icon: XCircle,       cls: 'bg-destructive/10 text-destructive border-destructive/20',           dot: 'bg-destructive' }
    case 'refunded':   return { icon: RotateCcw,     cls: 'bg-muted text-muted-foreground border-border',                      dot: 'bg-muted-foreground' }
    default:           return { icon: AlertCircle,   cls: 'bg-muted text-muted-foreground border-border',                      dot: 'bg-muted-foreground' }
  }
}

function methodIcon(method?: string) {
  if (!method) return <CreditCard className="w-4 h-4" />
  if (method.toLowerCase().includes('pesa')) return <Smartphone className="w-4 h-4 text-green-600" />
  if (method.toLowerCase().includes('bank')) return <Building2 className="w-4 h-4 text-blue-500" />
  return <CreditCard className="w-4 h-4 text-purple-500" />
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 flex items-center gap-3 ${accent ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? 'bg-primary/15' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-all">{value ?? '—'}</span>
      </div>
    </div>
  )
}

function TransactionsTab() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [method, setMethod]     = useState('all')
  const [ordering, setOrdering] = useState('-payment_date')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<Payment | null>(null)
  const [recheckingId, setRecheckingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', { search, status, method, ordering, page }],
    queryFn: () =>
      api.getPayments({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        payment_method: method === 'all' ? undefined : method,
        ordering,
        page,
        page_size: PAGE_SIZE,
      } as never),
    placeholderData: (prev) => prev,
  })

  const payments: Payment[] = Array.isArray(data) ? data : ((data as unknown as { results?: Payment[] })?.results ?? [])
  const total: number = Array.isArray(data) ? data.length : ((data as unknown as { count?: number })?.count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleRecheck = async (p: Payment) => {
    const id = p.payment_id || p.id
    setRecheckingId(id)
    try {
      const result = await api.checkPaymentStatus(id)
      if (result.payment?.status === 'completed') {
        toast.success('Payment confirmed!')
        qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
        if (selected?.payment_id === id) setSelected({ ...selected, status: 'completed' })
      } else {
        toast(`Still ${result.payment?.status ?? 'pending'}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not check status')
    } finally {
      setRecheckingId(null)
    }
  }

  const completed = payments.filter((p) => ['completed', 'paid', 'success'].includes(p.status))
  const pending   = payments.filter((p) => p.status === 'pending')
  const revenue   = completed.reduce((s, p) => s + parseFloat(p.amount), 0)
  const fmt = (n: number) => {
    if (n >= 1_000_000) {
      const millions = n / 1_000_000
      return `KSh ${Number.isInteger(millions) ? millions : Number(millions.toFixed(1))}m`
    }
    if (n >= 10_000) {
      const thousands = n / 1_000
      return `KSh ${Number.isInteger(thousands) ? thousands : Number(thousands.toFixed(1))}k`
    }
    return `KSh ${n.toLocaleString('en-KE')}`
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Revenue Collected"
          value={fmt(revenue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Payments"
          value={String(total)}
          icon={DollarSign}
        />
        <StatCard
          label="Completed"
          value={String(completed.length)}
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending"
          value={String(pending.length)}
          icon={Clock}
          accent={pending.length > 0}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 rounded-xl"
            placeholder="Search name, email, reference…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="w-full sm:w-44">
            <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={TX_STATUS_OPTIONS} />
          </div>
          <div className="w-full sm:w-44">
            <Select value={method} onChange={(v) => { setMethod(v); setPage(1) }} options={METHOD_OPTIONS} />
          </div>
          <div className="w-full sm:w-44">
            <Select value={ordering} onChange={setOrdering} options={SORT_OPTIONS} icon={<ArrowUpDown className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground text-sm">No transactions match your filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {payments.map((p) => {
            const pid = p.payment_id || p.id
            const cfg = txStatusConfig(p.status)
            const StatusIcon = cfg.icon
            const isRechecking = recheckingId === pid
            return (
              <div
                key={pid}
                onClick={() => setSelected(p)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {methodIcon(p.payment_method)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.student_name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.payment_reference ?? p.transaction_id ?? pid.slice(0, 12) + '…'}
                    {p.program_name && <span className="ml-1.5 opacity-60">· {p.program_name}</span>}
                  </p>
                </div>
                <div className="hidden sm:block shrink-0 text-right">
                  <p className="text-sm font-bold">
                    {p.currency ?? 'KSh'} {parseFloat(p.amount).toLocaleString('en-KE')}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.payment_date ?? p.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="capitalize">{p.status}</span>
                  </span>
                  {p.status === 'pending' && p.payment_reference && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRecheck(p) }}
                      disabled={isRechecking}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50 transition-colors"
                      title="Recheck payment status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
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

      {/* Transaction detail dialog */}
      {selected && (() => {
        const cfg = txStatusConfig(selected.status)
        const StatusIcon = cfg.icon
        const pid = selected.payment_id || selected.id
        return (
          <Dialog
            open={!!selected}
            onClose={() => setSelected(null)}
            title="Transaction Details"
            description={`Payment ID: ${pid}`}
            className="max-w-lg"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Amount</p>
                  <p className="text-3xl font-bold font-heading mt-0.5">
                    {selected.currency ?? 'KSh'} {parseFloat(selected.amount).toLocaleString('en-KE')}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.cls}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="capitalize">{selected.status}</span>
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Payer</p>
                <div className="divide-y divide-border">
                  <DetailRow icon={<Users className="w-4 h-4" />} label="Name" value={selected.student_name} />
                  <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selected.student_email} />
                  {selected.mobile_number && (
                    <DetailRow icon={<Phone className="w-4 h-4" />} label="Mobile" value={selected.mobile_number} />
                  )}
                  {selected.program_name && (
                    <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Program" value={selected.program_name} />
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Transaction</p>
                <div className="divide-y divide-border">
                  <DetailRow icon={<CreditCard className="w-4 h-4" />} label="Method" value={selected.payment_method} />
                  {selected.payment_reference && (
                    <DetailRow icon={<Hash className="w-4 h-4" />} label="Reference" value={selected.payment_reference} />
                  )}
                  {selected.transaction_id && (
                    <DetailRow icon={<Hash className="w-4 h-4" />} label="Transaction ID" value={selected.transaction_id} />
                  )}
                  <DetailRow icon={<Calendar className="w-4 h-4" />} label="Payment date" value={selected.payment_date ? formatFullDateTime(selected.payment_date) : undefined} />
                  {selected.confirmed_at && (
                    <DetailRow icon={<CheckCircle2 className="w-4 h-4" />} label="Confirmed at" value={formatFullDateTime(selected.confirmed_at)} />
                  )}
                  {selected.due_date && (
                    <DetailRow icon={<Clock className="w-4 h-4" />} label="Due date" value={formatDate(selected.due_date)} />
                  )}
                </div>
              </div>

              {(selected.description || selected.notes) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Notes</p>
                    {selected.description && <p className="text-sm text-muted-foreground px-1">{selected.description}</p>}
                    {selected.notes && <p className="text-sm text-muted-foreground px-1 mt-1">{selected.notes}</p>}
                  </div>
                </>
              )}

              {selected.status === 'pending' && selected.payment_reference && (
                <div className="pt-1">
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={recheckingId === pid}
                    onClick={() => handleRecheck(selected)}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${recheckingId === pid ? 'animate-spin' : ''}`} />
                    {recheckingId === pid ? 'Checking…' : 'Recheck payment status'}
                  </Button>
                </div>
              )}
              {selected.status === 'completed' && (
                <div className="pt-1">
                  <SendInvoiceButton
                    paymentId={pid}
                    size="default"
                    className="w-full"
                    label="Email invoice to student"
                  />
                </div>
              )}
              {selected.receipt_url && (
                <a
                  href={selected.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  View Receipt
                </a>
              )}
            </div>
          </Dialog>
        )
      })()}
    </div>
  )
}

// ─── Payment Plans tab ────────────────────────────────────────────────────────

const PP_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All requests' },
]

const PLAN_OPTIONS = [
  { value: 'One-time Payment', label: 'One-time Payment' },
  { value: '2 Installments', label: '2 Installments' },
  { value: '3 Installments', label: '3 Installments' },
]

function ppStatusClass(status: string) {
  if (status === 'approved') return 'bg-success/10 text-success border-success/20'
  if (status === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/20'
  return 'bg-warning/10 text-warning border-warning/20'
}

function PaymentPlansTab() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PaymentPlanChangeRequest | null>(null)
  const [approvedPlan, setApprovedPlan] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin', 'payment-plan-requests', status],
    queryFn: () => api.getPaymentPlanRequests({ status: status === 'all' ? undefined : status }),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((r) =>
      [r.student_name, r.student_email, r.program_name, r.requested_payment_plan]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [requests, search])

  const openRequest = (request: PaymentPlanChangeRequest) => {
    setSelected(request)
    setApprovedPlan(request.requested_payment_plan)
    setApprovedAmount(String(request.requested_installment_amount))
    setAdminNotes('')
  }

  const approveMutation = useMutation({
    mutationFn: () => api.approvePaymentPlanRequest(selected!.request_id, {
      paymentPlan: approvedPlan,
      installmentAmount: Number(approvedAmount),
      adminNotes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-plan-requests'] })
      setSelected(null)
      toast.success('Payment plan approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectPaymentPlanRequest(selected!.request_id, { adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-plan-requests'] })
      setSelected(null)
      toast.success('Payment plan rejected')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`}
        </p>
        <div className="w-44">
          <Select value={status} onChange={setStatus} options={PP_STATUS_OPTIONS} />
        </div>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, email, program..." />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <p className="text-sm text-muted-foreground">No payment plan requests found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map((request) => (
            <button
              key={request.request_id}
              onClick={() => openRequest(request)}
              className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{request.student_name ?? request.student_email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {request.program_name ?? 'Program'} · {request.student_email}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold">KSh {Number(request.requested_installment_amount).toLocaleString('en-KE')}</p>
                    <p className="text-xs text-muted-foreground">{request.requested_payment_plan}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ppStatusClass(request.status)}`}>
                    {request.status === 'pending' ? <Clock className="w-3 h-3" /> : request.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {request.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Dialog
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Payment Plan Request"
          description={selected.student_email}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm font-semibold mt-1">{selected.current_payment_plan || 'Standard plan'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.current_installment_amount ? `KSh ${Number(selected.current_installment_amount).toLocaleString('en-KE')}` : 'No installment set'}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Requested</p>
                <p className="text-sm font-semibold mt-1">{selected.requested_payment_plan}</p>
                <p className="text-xs text-muted-foreground mt-1">KSh {Number(selected.requested_installment_amount).toLocaleString('en-KE')}</p>
              </div>
            </div>

            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Student:</span> <strong>{selected.student_name}</strong></p>
              <p><span className="text-muted-foreground">Program:</span> <strong>{selected.program_name}</strong></p>
              <p><span className="text-muted-foreground">Submitted:</span> {formatFullDateTime(selected.created_at)}</p>
              {selected.reason && <p className="text-muted-foreground leading-relaxed">{selected.reason}</p>}
            </div>

            <Separator />

            {selected.status === 'pending' ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Approved plan</Label>
                    <Select value={approvedPlan} onChange={setApprovedPlan} options={PLAN_OPTIONS} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Approved installment (KSh)</Label>
                    <Input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Admin notes</Label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Optional note shown to the student" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || approveMutation.isPending}>
                    Reject
                  </Button>
                  <Button onClick={() => approveMutation.mutate()} disabled={rejectMutation.isPending || approveMutation.isPending || !approvedPlan || Number(approvedAmount) <= 0}>
                    Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold capitalize">{selected.status}</p>
                {selected.reviewed_at && <p className="text-xs text-muted-foreground mt-1">Reviewed {formatFullDateTime(selected.reviewed_at)} by {selected.reviewed_by}</p>}
                {selected.admin_notes && <p className="text-sm text-muted-foreground mt-2">{selected.admin_notes}</p>}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ─── Manual Requests tab ──────────────────────────────────────────────────────

function ManualRequestsTab() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ManualPaymentRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin', 'manual-payment-requests', status],
    queryFn: () => api.getManualPaymentRequests({ status: status === 'all' ? undefined : status }),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((r) =>
      [r.student_name, r.student_email, r.reference, r.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [requests, search])

  const approveMutation = useMutation({
    mutationFn: () => api.approveManualPaymentRequest(selected!.request_id, { adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'manual-payment-requests'] })
      qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      setSelected(null)
      setAdminNotes('')
      toast.success('Payment approved and posted to the student account')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectManualPaymentRequest(selected!.request_id, { adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'manual-payment-requests'] })
      setSelected(null)
      setAdminNotes('')
      toast.success('Request rejected')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`}
        </p>
        <div className="w-44">
          <Select value={status} onChange={setStatus} options={PP_STATUS_OPTIONS} />
        </div>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, email, reference..." />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <p className="text-sm text-muted-foreground">No manual reconciliation requests found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map((request) => (
            <button
              key={request.request_id}
              onClick={() => { setSelected(request); setAdminNotes('') }}
              className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{request.student_name ?? request.student_email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {request.payment_method} · {formatDate(request.payment_date)}
                    {request.reference && <span className="ml-1 opacity-60">· {request.reference}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold">KSh {Number(request.amount).toLocaleString('en-KE')}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ppStatusClass(request.status)}`}>
                    {request.status === 'pending' ? <Clock className="w-3 h-3" /> : request.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {request.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Dialog
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Manual Reconciliation Request"
          description={selected.student_email}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-lg font-bold mt-1">KSh {Number(selected.amount).toLocaleString('en-KE')}</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.payment_method}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Payment date</p>
                <p className="text-sm font-semibold mt-1">{formatDate(selected.payment_date)}</p>
                {selected.reference && <p className="text-xs text-muted-foreground mt-1">Ref: {selected.reference}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide">Proof message</p>
              <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">{selected.provider_message}</p>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Student:</span> <strong>{selected.student_name}</strong></p>
              <p><span className="text-muted-foreground">Submitted:</span> {formatFullDateTime(selected.created_at)}</p>
            </div>

            <Separator />

            {selected.status === 'pending' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Admin notes</Label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Optional note shown to the student" />
                </div>
                <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                  Approving posts a completed payment of KSh {Number(selected.amount).toLocaleString('en-KE')} and emails a PDF invoice to the student.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || approveMutation.isPending}>
                    Reject
                  </Button>
                  <Button onClick={() => approveMutation.mutate()} disabled={rejectMutation.isPending || approveMutation.isPending}>
                    {approveMutation.isPending ? 'Approving…' : 'Approve & Post'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold capitalize">{selected.status}</p>
                {selected.reviewed_at && <p className="text-xs text-muted-foreground mt-1">Reviewed {formatFullDateTime(selected.reviewed_at)} by {selected.reviewed_by}</p>}
                {selected.admin_notes && <p className="text-sm text-muted-foreground mt-2">{selected.admin_notes}</p>}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ─── Combined page ────────────────────────────────────────────────────────────

type Tab = 'transactions' | 'payment-plans' | 'manual-requests'

const TABS: { value: Tab; label: string }[] = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'payment-plans', label: 'Plan Request Changes' },
  { value: 'manual-requests', label: 'Manual Requests' },
]

export function Payments() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/admin/payments' }) as { tab?: Tab }
  const tab: Tab = search.tab ?? 'transactions'

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage transactions and payment plan requests</p>
          </div>
        </div>

        <UnderlineTabs tabs={TABS} active={tab} onChange={(v) => navigate({ to: '/admin/payments', search: { tab: v as Tab } } as never)} />

        {tab === 'transactions' && <TransactionsTab />}
        {tab === 'payment-plans' && <PaymentPlansTab />}
        {tab === 'manual-requests' && <ManualRequestsTab />}
      </div>
    </AdminLayout>
  )
}
