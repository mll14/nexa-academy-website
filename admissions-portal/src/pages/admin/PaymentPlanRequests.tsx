import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Search, XCircle } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import * as api from '../../lib/api'
import { formatFullDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { PaymentPlanChangeRequest } from '../../types'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All requests' },
]

function statusClass(status: string) {
  if (status === 'approved') return 'bg-success/10 text-success border-success/20'
  if (status === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/20'
  return 'bg-warning/10 text-warning border-warning/20'
}

export function PaymentPlanRequests() {
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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Payment Plan Requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading...' : `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="w-44">
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
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
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                      {request.status === 'pending' ? <Clock className="w-3 h-3" /> : request.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {request.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
                    <Input value={approvedPlan} onChange={(e) => setApprovedPlan(e.target.value)} />
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
    </AdminLayout>
  )
}
