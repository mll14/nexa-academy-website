import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, Search, ArrowUpDown, X, CreditCard,
  Smartphone, Building2, CheckCircle2, Clock, XCircle,
  RotateCcw, DollarSign, TrendingUp, Users, AlertCircle,
  Calendar, Hash, Phone, Mail, BookOpen,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Input } from '../../components/ui/input'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { formatDate, formatFullDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Payment } from '../../types'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
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

function statusConfig(status: string) {
  switch (status) {
    case 'completed': return { icon: CheckCircle2, cls: 'bg-success/10 text-success border-success/20', dot: 'bg-success' }
    case 'pending':   return { icon: Clock,         cls: 'bg-warning/10 text-warning border-warning/20',   dot: 'bg-warning' }
    case 'processing':return { icon: RefreshCw,     cls: 'bg-primary/10 text-primary border-primary/20',   dot: 'bg-primary' }
    case 'failed':    return { icon: XCircle,       cls: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' }
    case 'refunded':  return { icon: RotateCcw,     cls: 'bg-muted text-muted-foreground border-border',   dot: 'bg-muted-foreground' }
    default:          return { icon: AlertCircle,   cls: 'bg-muted text-muted-foreground border-border',   dot: 'bg-muted-foreground' }
  }
}

function methodIcon(method?: string) {
  if (!method) return <CreditCard className="w-4 h-4" />
  if (method.toLowerCase().includes('pesa')) return <Smartphone className="w-4 h-4 text-green-600" />
  if (method.toLowerCase().includes('bank')) return <Building2 className="w-4 h-4 text-blue-500" />
  return <CreditCard className="w-4 h-4 text-purple-500" />
}


function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold font-heading mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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

export function Transactions() {
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

  const checkAllMutation = useMutation({
    mutationFn: api.backfillEnrollments,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      toast.success('Pending payments checked')
    },
    onError: (e: Error) => toast.error(e.message),
  })

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

  // Stats from full unfiltered fetch or current page data
  const completed = payments.filter((p) => ['completed', 'paid', 'success'].includes(p.status))
  const pending   = payments.filter((p) => p.status === 'pending')
  const revenue   = completed.reduce((s, p) => s + parseFloat(p.amount), 0)

  const fmt = (n: number) => `KSh ${n.toLocaleString('en-KE')}`

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${total} payment${total !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${checkAllMutation.isPending ? 'animate-spin' : ''}`} />
            Check pending
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Revenue collected" value={fmt(revenue)} icon={<TrendingUp className="w-5 h-5" />} />
          <StatCard label="Total payments" value={String(total)} icon={<DollarSign className="w-5 h-5" />} />
          <StatCard label="Completed" value={String(completed.length)} icon={<CheckCircle2 className="w-5 h-5" />} />
          <StatCard label="Pending" value={String(pending.length)} icon={<Clock className="w-5 h-5" />} sub={pending.length > 0 ? 'awaiting confirmation' : undefined} />
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
          <div className="flex gap-2.5">
            <div className="w-44">
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTIONS} />
            </div>
            <div className="w-44">
              <Select value={method} onChange={(v) => { setMethod(v); setPage(1) }} options={METHOD_OPTIONS} />
            </div>
            <div className="w-44">
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
              const cfg = statusConfig(p.status)
              const StatusIcon = cfg.icon
              const isRechecking = recheckingId === pid
              return (
                <div
                  key={pid}
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  {/* Method icon */}
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {methodIcon(p.payment_method)}
                  </div>

                  {/* Name + ref */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.student_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.payment_reference ?? p.transaction_id ?? pid.slice(0, 12) + '…'}
                      {p.program_name && <span className="ml-1.5 opacity-60">· {p.program_name}</span>}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="hidden sm:block shrink-0 text-right">
                    <p className="text-sm font-bold">
                      {p.currency ?? 'KSh'} {parseFloat(p.amount).toLocaleString('en-KE')}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.payment_date ?? p.created_at)}</p>
                  </div>

                  {/* Status badge */}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction detail dialog */}
      {selected && (() => {
        const cfg = statusConfig(selected.status)
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
              {/* Amount hero */}
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

              {/* Payer info */}
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

              {/* Transaction info */}
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

              {/* Actions */}
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
    </AdminLayout>
  )
}
