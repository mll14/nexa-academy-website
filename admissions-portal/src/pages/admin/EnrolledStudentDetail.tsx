import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Phone, BookOpen, Calendar,
  CreditCard, MessageSquare, User, Send, Activity,
  BadgeCheck, CircleDashed, RefreshCw, CircleX,
  Banknote, ChevronRight, GraduationCap, CheckCircle2, XCircle, AlertCircle,
  TrendingDown, TrendingUp, ReceiptText, ExternalLink,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Separator } from '../../components/ui/separator'
import { Dialog } from '../../components/ui/dialog'
import { Select } from '../../components/ui/select'
import { AdminNotesPanel } from '../../components/admin/AdminNotesPanel'
import { EmailEditor } from '../../components/admin/EmailEditor'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Payment, FinancialReconciliation, ReconciliationLedgerLine } from '../../types/index'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtKSh(n: number | string): string {
  const num = Number(n)
  return `KSh ${num.toLocaleString('en-KE')}`
}

function enrollmentStatusConfig(s: string) {
  switch (s) {
    case 'active':    return { cls: 'bg-success/10 text-success border-success/20',            icon: CheckCircle2,  label: 'Active' }
    case 'completed': return { cls: 'bg-primary/10 text-primary border-primary/20',            icon: GraduationCap, label: 'Completed' }
    case 'withdrawn': return { cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle,       label: 'Withdrawn' }
    default:          return { cls: 'bg-muted text-muted-foreground border-border',            icon: AlertCircle,   label: s }
  }
}

const NEXT_STATUSES: Record<string, { value: string; label: string }[]> = {
  active:    [{ value: 'completed', label: 'Mark Completed' }, { value: 'withdrawn', label: 'Mark Withdrawn' }],
  completed: [{ value: 'active',    label: 'Reactivate' }],
  withdrawn: [{ value: 'active',    label: 'Reactivate' }],
}

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  completed:  'bg-success/10 text-success border-success/20',
  pending:    'bg-warning/10 text-warning border-warning/20',
  processing: 'bg-blue-50 text-blue-600 border-blue-200',
  failed:     'bg-destructive/10 text-destructive border-destructive/20',
  refunded:   'bg-muted text-muted-foreground border-border',
}

const PAYMENT_FOLLOW_UP_TEMPLATES = [
  {
    label: 'Fee payment reminder',
    subject: 'Reminder: Outstanding Fee Balance — Nexa Academy',
    body: `<p>Hi {name},</p>
<p>This is a friendly reminder that you have an outstanding balance on your Nexa Academy account.</p>
<p>Please log in to your student portal to make a payment or reach out if you have any questions about your payment plan.</p>
<p>Warm regards,<br/>Nexa Academy Admissions</p>`,
  },
  {
    label: 'Final payment notice',
    subject: 'Important: Final Payment Notice — Nexa Academy',
    body: `<p>Hi {name},</p>
<p>We want to bring to your attention that your account has an outstanding balance that remains unpaid. To avoid any disruption to your studies, we kindly ask that you settle this balance at your earliest convenience.</p>
<p>If you're experiencing financial difficulties, please don't hesitate to reach out so we can discuss possible arrangements.</p>
<p>Best regards,<br/>Nexa Academy Admissions</p>`,
  },
  {
    label: 'Payment received confirmation',
    subject: 'Payment Received — Thank You!',
    body: `<p>Hi {name},</p>
<p>We're writing to confirm that we have received your recent payment. Thank you for keeping up with your fee obligations.</p>
<p>If you have any questions about your account balance, please don't hesitate to get in touch.</p>
<p>Best regards,<br/>Nexa Academy Admissions</p>`,
  },
]

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, className }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span className="text-primary">{icon}</span>
          <h2 className="font-heading font-semibold text-sm">{title}</h2>
        </div>
        <Separator />
        <div className="px-5 pb-5">{children}</div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{value ?? '—'}</span>
      </div>
    </div>
  )
}

// ── Finance tab ───────────────────────────────────────────────────────────────

function paymentStatusIcon(s: string) {
  if (s === 'completed') return <BadgeCheck className="w-3.5 h-3.5 text-success" />
  if (s === 'failed')    return <CircleX className="w-3.5 h-3.5 text-destructive" />
  if (s === 'refunded')  return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
  return <CircleDashed className="w-3.5 h-3.5 text-warning" />
}

function FinanceTab({
  payments,
  reconciliation,
  totalFee,
  amountPaid,
  balance,
  onTakePayment,
}: {
  payments: Payment[]
  reconciliation: FinancialReconciliation | null
  totalFee: number
  amountPaid: number
  balance: number
  onTakePayment: () => void
}) {
  const [finTab, setFinTab] = useState<'payments' | 'ledger'>('payments')
  const fullPct   = totalFee > 0 ? Math.min(100, (amountPaid / totalFee) * 100) : 0
  const fullyPaid = balance <= 0 && totalFee > 0
  const ledger    = reconciliation?.ledger ?? []

  return (
    <div className="space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fee',   value: fmtKSh(totalFee),  highlight: false },
          { label: 'Amount Paid', value: fmtKSh(amountPaid), highlight: true },
          { label: 'Balance Due', value: fmtKSh(Math.max(0, balance)), warn: balance > 0 },
        ].map(({ label, value, highlight, warn }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 ${
            highlight ? 'bg-success/5 border-success/20'
            : warn     ? 'bg-warning/5 border-warning/20'
            :            'bg-muted/30 border-border'
          }`}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${highlight ? 'text-success' : warn && balance > 0 ? 'text-warning' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold font-heading">Payment Progress</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={onTakePayment}>
              <CreditCard className="w-3 h-3 mr-1.5" /> Take Payment
            </Button>
            {fullyPaid ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                <BadgeCheck className="w-3.5 h-3.5" /> Fully Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                <CircleDashed className="w-3.5 h-3.5" /> Outstanding
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{Math.round(fullPct)}% paid</span>
            <span className={`font-semibold ${fullyPaid ? 'text-success' : 'text-foreground'}`}>
              {fmtKSh(amountPaid)} / {fmtKSh(totalFee)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fullyPaid ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${fullPct}%` }}
            />
          </div>
        </div>
        {balance > 0 && (
          <p className="text-xs text-muted-foreground">
            {fmtKSh(balance)} remaining to complete payment.
          </p>
        )}
      </div>

      {/* Sub-tabs: payments vs ledger */}
      <div className="flex border-b border-border">
        {([
          { id: 'payments', label: `Transactions (${payments.length})`, icon: CreditCard },
          { id: 'ledger',   label: `Ledger (${ledger.length})`,         icon: ReceiptText },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFinTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              finTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      {finTab === 'payments' && (
        payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No transactions recorded yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {paymentStatusIcon(p.status)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{fmtKSh(p.amount)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.payment_type?.replace(/_/g, ' ') ?? 'Payment'}
                        {p.payment_reference && <span className="ml-1 opacity-60">· {p.payment_reference}</span>}
                      </p>
                      {p.description && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{p.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STATUS_STYLE[p.status] ?? ''}`}>
                      {paymentStatusIcon(p.status)} {p.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Reconciliation ledger */}
      {finTab === 'ledger' && (
        ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ReceiptText className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No ledger entries available</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Ledger header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              <span>Description</span>
              <span className="text-right w-24">Debit</span>
              <span className="text-right w-24">Credit</span>
              <span className="text-right w-24">Balance</span>
            </div>
            <div className="divide-y divide-border">
              {ledger.map((line: ReconciliationLedgerLine, i) => {
                const isFee     = line.type === 'fee'
                const isCredit  = Number(line.credit) > 0
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3 text-xs hover:bg-muted/20 transition-colors ${
                      isFee ? 'bg-destructive/3' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isFee
                          ? <TrendingDown className="w-3 h-3 text-destructive shrink-0" />
                          : <TrendingUp className="w-3 h-3 text-success shrink-0" />
                        }
                        <span className="font-medium truncate">{line.description}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 pl-5">
                        {line.date && <span className="text-muted-foreground">{formatDate(line.date)}</span>}
                        {line.reference && <span className="text-muted-foreground/60">· {line.reference}</span>}
                        {line.status && line.status !== 'N/A' && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            line.status === 'completed' ? 'bg-success/10 text-success'
                            : line.status === 'pending' ? 'bg-warning/10 text-warning'
                            :                             'bg-muted text-muted-foreground'
                          }`}>
                            {line.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      {Number(line.debit) > 0
                        ? <span className="font-semibold text-destructive">{fmtKSh(line.debit)}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div className="w-24 text-right">
                      {isCredit
                        ? <span className="font-semibold text-success">{fmtKSh(line.credit)}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div className="w-24 text-right">
                      <span className={`font-bold ${Number(line.balance) > 0 ? 'text-warning' : 'text-success'}`}>
                        {fmtKSh(line.balance)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Closing balance */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3 border-t border-border bg-muted/40">
              <span className="text-xs font-semibold">Closing Balance</span>
              <div className="w-24" />
              <div className="w-24" />
              <div className="w-24 text-right">
                <span className={`text-sm font-bold ${
                  reconciliation && Number(reconciliation.amount_remaining) > 0 ? 'text-warning' : 'text-success'
                }`}>
                  {fmtKSh(reconciliation?.amount_remaining ?? 0)}
                </span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EnrolledStudentDetail() {
  const { enrollmentId } = useParams({ from: '/admin/enrolled/$enrollmentId' })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [leftTab, setLeftTab] = useState<'details' | 'finance' | 'notes' | 'email'>('details')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDescription, setPayDescription] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  const todayIso = new Date().toISOString().slice(0, 10)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [manualMethod, setManualMethod] = useState('Bank Transfer')
  const [manualDate, setManualDate] = useState(todayIso)
  const [manualReference, setManualReference] = useState('')
  const [manualMessage, setManualMessage] = useState('')

  const [showWaiverDialog, setShowWaiverDialog] = useState(false)
  const [waiverType, setWaiverType] = useState<'percentage' | 'amount'>('percentage')
  const [waiverValue, setWaiverValue] = useState('')
  const [waiverReason, setWaiverReason] = useState('')

  // Fetch enrollment
  const { data: enrollment, isLoading, error } = useQuery({
    queryKey: ['admin', 'enrollment', enrollmentId],
    queryFn: () => api.getEnrollmentById(enrollmentId),
  })

  const studentUid  = enrollment?.student ?? ''
  const studentEmail = enrollment?.student_details?.email ?? enrollment?.student_email ?? ''

  // Fetch student detail (includes reconciliation)
  const { data: studentDetail } = useQuery({
    queryKey: ['admin', 'student-detail', studentUid],
    queryFn: () => api.getStudentDetail(studentUid),
    enabled: !!studentUid,
  })

  // Fetch payments
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments', 'enrollment', studentEmail],
    queryFn: async () => {
      const res = await api.getPayments({ search: studentEmail })
      return Array.isArray(res) ? res : (res as { results?: Payment[] }).results ?? []
    },
    enabled: !!studentEmail,
  })

  const reconciliation: FinancialReconciliation | null = studentDetail?.reconciliation ?? null

  // Find the enrolled application (for notes)
  const enrolledApplication = studentDetail?.applications?.find((a) => a.status === 'enrolled')

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.updateEnrollment(enrollmentId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollment', enrollmentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      setNewStatus('')
      toast.success('Enrollment status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resetManualForm = () => {
    setManualAmount('')
    setManualMethod('Bank Transfer')
    setManualDate(todayIso)
    setManualReference('')
    setManualMessage('')
  }

  const recordManualMutation = useMutation({
    mutationFn: () => api.recordManualPayment({
      studentUid,
      amount: Number(manualAmount),
      paymentMethod: manualMethod,
      paymentDate: manualDate,
      reference: manualReference,
      providerMessage: manualMessage,
      programId: enrollment?.program ?? enrollment?.program_id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', 'enrollment', studentEmail] })
      qc.invalidateQueries({ queryKey: ['admin', 'student-detail', studentUid] })
      setShowManualDialog(false)
      resetManualForm()
      setLeftTab('finance')
      toast.success('Manual payment recorded — invoice emailed to student')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const applyWaiverMutation = useMutation({
    mutationFn: () => api.applyEnrollmentWaiver(enrollmentId, {
      discountType: waiverType,
      discountValue: Number(waiverValue),
      reason: waiverReason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollment', enrollmentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'student-detail', studentUid] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      setShowWaiverDialog(false)
      setWaiverValue('')
      setWaiverReason('')
      toast.success('Fee waiver applied')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeWaiverMutation = useMutation({
    mutationFn: () => api.removeEnrollmentWaiver(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollment', enrollmentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'student-detail', studentUid] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      toast.success('Fee waiver removed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sendEmailMutation = useMutation({
    mutationFn: () => api.sendFollowUp({
      to: studentEmail,
      name: enrollment?.student_name ?? enrollment?.student_details?.display_name,
      subject: emailSubject,
      message: emailBody,
    }),
    onSuccess: () => {
      toast.success(`Email sent to ${studentEmail}`)
      setEmailSubject('')
      setEmailBody('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAdminPayment = async () => {
    if (!enrollment || !payAmount) return
    setPayLoading(true)
    try {
      const res = await api.adminSendPaymentLink({
        studentUid: studentUid,
        amount: Number(payAmount),
        description: payDescription,
        programId: enrollment.program ?? enrollment.program_id,
      })
      const { default: PaystackPop } = await import('@paystack/inline-js')
      const popup = new PaystackPop()
      try {
        popup.newTransaction({
          key: res.public_key,
          email: res.student_email,
          amount: Number(payAmount) * 100,
          currency: 'KES',
          ref: res.reference,
          access_code: res.access_code,
          onSuccess: async (tx: { reference: string }) => {
            toast.loading('Verifying payment…')
            try {
              await api.verifyPayment(tx.reference)
              toast.dismiss()
              toast.success('Payment successful — recorded to student account')
              qc.invalidateQueries({ queryKey: ['payments', 'enrollment', studentEmail] })
              qc.invalidateQueries({ queryKey: ['admin', 'student-detail', studentUid] })
              setShowPayDialog(false)
              setPayAmount('')
              setPayDescription('')
              setLeftTab('finance')
            } catch {
              toast.dismiss()
              toast.error('Payment was made but verification failed — refresh or check Transactions')
            }
          },
          onCancel: () => toast('Payment cancelled'),
        })
      } catch {
        if (res.authorization_url) {
          window.open(res.authorization_url, '_blank')
          toast('Opened Paystack checkout in a new tab')
        } else {
          toast.error('Could not open Paystack checkout')
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not initialise payment')
    } finally {
      setPayLoading(false)
    }
  }

  const applyTemplate = (tpl: typeof PAYMENT_FOLLOW_UP_TEMPLATES[0]) => {
    const name = enrollment?.student_name ?? enrollment?.student_details?.display_name ?? 'Student'
    setEmailSubject(tpl.subject)
    setEmailBody(tpl.body.replace(/{name}/g, name))
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !enrollment) {
    return (
      <AdminLayout>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-destructive font-medium">Enrollment not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/admin/enrolled' })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Enrolled Students
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const studentName = enrollment.student_name ?? enrollment.student_details?.display_name ?? 'Student'
  const phone       = enrollment.student_details?.phone
  const totalFee    = enrollment.amount
  const amountPaid  = enrollment.amount_paid ?? 0
  const discountAmount = Number(enrollment.discount_amount ?? 0)
  const hasWaiver   = discountAmount > 0
  const balance     = enrollment.balance ?? Math.max(0, totalFee - discountAmount - amountPaid)
  const cfg         = enrollmentStatusConfig(enrollment.status)
  const StatusIcon  = cfg.icon
  const nextOptions = NEXT_STATUSES[enrollment.status] ?? []

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate({ to: '/admin/enrolled' })}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Enrolled Students
            </button>
            {studentUid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/admin/students/$uid', params: { uid: studentUid } })}
                className="gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                View Student Profile
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {studentName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold">{studentName}</h1>
                <p className="text-sm text-muted-foreground">{studentEmail}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${cfg.cls} self-start sm:self-auto`}>
              <StatusIcon className="w-4 h-4" />{cfg.label}
            </span>
          </div>

          {/* Fee summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Fee',   value: fmtKSh(totalFee),  cls: '' },
              { label: 'Amount Paid', value: fmtKSh(amountPaid), cls: 'bg-success/5 border-success/20' },
              { label: 'Balance Due', value: fmtKSh(Math.max(0, balance)), cls: balance > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-2xl border px-5 py-3 bg-card ${cls || 'border-border'}`}>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-xl font-bold font-heading mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Tab bar */}
            <div className="border-b border-border">
              <div className="flex overflow-x-auto">
                {([
                  { id: 'details', label: 'Details',  icon: User },
                  { id: 'finance', label: 'Finance',  icon: CreditCard },
                  { id: 'notes',   label: 'Notes',    icon: MessageSquare },
                  { id: 'email',   label: 'Email',    icon: Mail },
                ] as { id: 'details' | 'finance' | 'notes' | 'email'; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setLeftTab(id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                      leftTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details tab */}
            {leftTab === 'details' && (
              <>
                <SectionCard title="Student Details" icon={<User className="w-4 h-4" />}>
                  <div className="divide-y divide-border">
                    <InfoRow label="Email"   value={studentEmail} icon={<Mail className="w-4 h-4" />} />
                    {phone && <InfoRow label="Phone" value={phone} icon={<Phone className="w-4 h-4" />} />}
                    <InfoRow label="Program" value={enrollment.program_name} icon={<BookOpen className="w-4 h-4" />} />
                    <InfoRow label="Enrolled On"  value={enrollment.enrollment_date ? formatDate(enrollment.enrollment_date) : undefined} icon={<Calendar className="w-4 h-4" />} />
                    {enrollment.start_date && <InfoRow label="Start Date" value={formatDate(enrollment.start_date)} icon={<Calendar className="w-4 h-4" />} />}
                    {enrollment.end_date   && <InfoRow label="End Date"   value={formatDate(enrollment.end_date)}   icon={<Calendar className="w-4 h-4" />} />}
                  </div>
                </SectionCard>

                <SectionCard title="Fee Information" icon={<CreditCard className="w-4 h-4" />}>
                  <div className="divide-y divide-border">
                    <InfoRow label="Total Fee"    value={fmtKSh(totalFee)}  icon={<Banknote className="w-4 h-4" />} />
                    {hasWaiver && (
                      <InfoRow
                        label="Fee Waiver"
                        value={`− ${fmtKSh(discountAmount)}${enrollment.discount_type === 'percentage' ? ` (${enrollment.discount_value}%)` : ''}`}
                        icon={<TrendingDown className="w-4 h-4" />}
                      />
                    )}
                    <InfoRow label="Amount Paid"  value={fmtKSh(amountPaid)} icon={<BadgeCheck className="w-4 h-4" />} />
                    <InfoRow
                      label="Balance Due"
                      value={fmtKSh(Math.max(0, balance))}
                      icon={<CircleDashed className="w-4 h-4" />}
                    />
                    {enrollment.payment_plan && (
                      <InfoRow
                        label="Payment Plan"
                        value={enrollment.payment_plan.replace('installment', 'Installment').replace('full', 'Full Payment')}
                        icon={<CreditCard className="w-4 h-4" />}
                      />
                    )}
                    {enrollment.installment_amount && (
                      <InfoRow
                        label="Installment Amount"
                        value={fmtKSh(enrollment.installment_amount as number)}
                        icon={<Banknote className="w-4 h-4" />}
                      />
                    )}
                  </div>
                </SectionCard>

                {/* Activity / payment events */}
                {payments.length > 0 && (
                  <SectionCard
                    title={`Payment Activity · ${payments.length} transaction${payments.length !== 1 ? 's' : ''}`}
                    icon={<Activity className="w-4 h-4" />}
                  >
                    <div className="pt-4">
                      {payments.map((p, i) => {
                        const isLast = i === payments.length - 1
                        return (
                          <div key={p.id} className="flex gap-4">
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-3 h-3 rounded-full mt-1 border-2 ${
                                p.status === 'completed' ? 'bg-success border-success' : 'bg-warning border-warning'
                              }`} />
                              {!isLast && <div className="w-0.5 flex-1 bg-border/60 my-1" />}
                            </div>
                            <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-5'}`}>
                              <div className={`rounded-xl border px-4 py-3 ${
                                p.status === 'completed' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
                              }`}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="w-3.5 h-3.5 text-success shrink-0" />
                                    <span className="text-xs font-semibold text-foreground">
                                      {fmtKSh(p.amount)}
                                      {p.payment_type && (
                                        <span className="font-normal text-muted-foreground ml-1">
                                          · {p.payment_type.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STATUS_STYLE[p.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                                      {p.status}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.created_at)}</span>
                                </div>
                                {p.payment_reference && (
                                  <p className="text-xs text-muted-foreground/60 mt-1">Ref: {p.payment_reference}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* Finance tab */}
            {leftTab === 'finance' && (
              <FinanceTab
                payments={payments}
                reconciliation={reconciliation}
                totalFee={totalFee}
                amountPaid={amountPaid}
                balance={balance}
                onTakePayment={() => setShowPayDialog(true)}
              />
            )}

            {/* Notes tab */}
            {leftTab === 'notes' && (
              enrolledApplication ? (
                <AdminNotesPanel
                  source={{ kind: 'application', applicationId: enrolledApplication.id }}
                  stage="enrolled"
                  title="Internal Notes"
                  emptyText="No internal notes for this student yet."
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">Notes unavailable</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Notes are linked to the student's application. No enrolled application found for this student.
                  </p>
                </div>
              )
            )}

            {/* Email tab */}
            {leftTab === 'email' && (
              <div className="space-y-4">
                {/* Recipient strip */}
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="text-sm font-medium truncate">{studentName} &lt;{studentEmail}&gt;</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">via admissions@nexaacademy.co.ke</span>
                </div>

                {/* Quick templates */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Quick templates</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_FOLLOW_UP_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        onClick={() => applyTemplate(tpl)}
                        className="px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/50 text-xs font-medium transition-colors"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="e.g. Fee Payment Reminder"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* Rich email editor */}
                <div style={{ minHeight: 380 }}>
                  <EmailEditor
                    value={emailBody}
                    onChange={setEmailBody}
                    previewSubject={emailSubject}
                    previewText=""
                  />
                </div>

                {/* Send bar */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Sent directly to the student — not logged as a newsletter campaign.
                  </p>
                  <Button
                    className="shrink-0 gap-1.5"
                    disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending}
                    onClick={() => sendEmailMutation.mutate()}
                  >
                    {sendEmailMutation.isPending
                      ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                    {sendEmailMutation.isPending ? 'Sending…' : 'Send Email'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Enrollment status */}
            <SectionCard title="Enrollment Status" icon={<Activity className="w-4 h-4" />}>
              <div className="pt-4 space-y-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                  <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
                </span>
                {nextOptions.length > 0 ? (
                  <>
                    <Select
                      value={newStatus}
                      onChange={setNewStatus}
                      placeholder="Change status…"
                      options={nextOptions}
                    />
                    <Button
                      className="w-full"
                      disabled={!newStatus || updateStatusMutation.isPending}
                      onClick={() => newStatus && updateStatusMutation.mutate(newStatus)}
                    >
                      {updateStatusMutation.isPending ? 'Saving…' : 'Apply Status'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No further transitions available.</p>
                )}
              </div>
            </SectionCard>

            {/* Quick payment */}
            <SectionCard title="Payment" icon={<CreditCard className="w-4 h-4" />}>
              <div className="pt-4 space-y-3">
                {balance > 0 && (
                  <div className="rounded-xl bg-warning/5 border border-warning/20 px-3.5 py-3">
                    <p className="text-xs font-semibold text-warning">Outstanding balance</p>
                    <p className="text-lg font-bold text-warning mt-0.5">{fmtKSh(Math.max(0, balance))}</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => setShowPayDialog(true)}>
                  <CreditCard className="w-4 h-4 mr-2" /> Take Payment
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowManualDialog(true)}>
                  <Banknote className="w-4 h-4 mr-2" /> Record Manual Payment
                </Button>
                {hasWaiver ? (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-3.5 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary">Fee waiver applied</p>
                      <p className="text-sm font-bold text-primary">−{fmtKSh(discountAmount)}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {enrollment.discount_type === 'percentage'
                        ? `${enrollment.discount_value}% off`
                        : 'Fixed amount'}
                      {enrollment.discount_reason ? ` · ${enrollment.discount_reason}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeWaiverMutation.mutate()}
                      disabled={removeWaiverMutation.isPending}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      {removeWaiverMutation.isPending ? 'Removing…' : 'Remove waiver'}
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setShowWaiverDialog(true)}>
                    <TrendingDown className="w-4 h-4 mr-2" /> Apply Fee Waiver
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setLeftTab('finance')}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ReceiptText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">View finance ledger</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </SectionCard>

            {/* Notes shortcut */}
            <button
              type="button"
              onClick={() => setLeftTab('notes')}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm font-semibold">Internal Notes</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Add admin notes for this student's enrollment.
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>

            {/* Email shortcut */}
            <button
              type="button"
              onClick={() => setLeftTab('email')}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm font-semibold">Send Follow-up Email</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Fee reminders, payment confirmations, and more.
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog
        open={showPayDialog}
        onClose={() => { setShowPayDialog(false); setPayAmount(''); setPayDescription('') }}
        title="Process Payment"
        description={`Opens Paystack checkout for ${studentName}. Payment will be recorded to their account.`}
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (KSh) *</label>
            <Input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 10000"
              min="100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={payDescription}
              onChange={(e) => setPayDescription(e.target.value)}
              placeholder="e.g. Program fee installment"
            />
          </div>
          {payAmount && (
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              Paystack will charge{' '}
              <span className="font-medium text-foreground">KSh {Number(payAmount).toLocaleString('en-KE')}</span>{' '}
              using <span className="font-medium text-foreground">{studentEmail}</span>.
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={payLoading || !payAmount || Number(payAmount) < 100}
              onClick={handleAdminPayment}
            >
              {payLoading ? 'Opening Paystack…' : <><CreditCard className="w-4 h-4 mr-1.5" /> Process Payment</>}
            </Button>
            <Button variant="outline" onClick={() => { setShowPayDialog(false); setPayAmount(''); setPayDescription('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Manual reconciliation dialog */}
      <Dialog
        open={showManualDialog}
        onClose={() => { setShowManualDialog(false); resetManualForm() }}
        title="Record Manual Payment"
        description={`Record a payment ${studentName} made outside the LMS (KCB transfer, cash, etc.). This posts a completed payment and emails a PDF invoice.`}
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount (KSh) *</label>
              <Input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="e.g. 10000"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Method *</label>
              <Select
                value={manualMethod}
                onChange={setManualMethod}
                options={[
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'KCB', label: 'KCB Bank Transfer' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'M-Pesa', label: 'M-Pesa' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment date *</label>
              <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={todayIso} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reference</label>
              <Input
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                placeholder="e.g. KCB txn ref"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Provider message</label>
            <textarea
              className="w-full min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="Paste the bank/service confirmation message (optional)"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={recordManualMutation.isPending || !manualAmount || Number(manualAmount) <= 0 || !manualDate}
              onClick={() => recordManualMutation.mutate()}
            >
              {recordManualMutation.isPending ? 'Recording…' : <><Banknote className="w-4 h-4 mr-1.5" /> Record Payment</>}
            </Button>
            <Button variant="outline" onClick={() => { setShowManualDialog(false); resetManualForm() }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Fee waiver dialog */}
      <Dialog
        open={showWaiverDialog}
        onClose={() => { setShowWaiverDialog(false); setWaiverValue(''); setWaiverReason('') }}
        title="Apply Fee Waiver"
        description={`Reduce ${studentName}'s ${enrollment.program_name} fee by a manually-agreed discount.`}
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type *</label>
              <Select
                value={waiverType}
                onChange={(v) => setWaiverType(v as 'percentage' | 'amount')}
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'amount', label: 'Fixed amount (KSh)' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{waiverType === 'percentage' ? 'Percent *' : 'Amount (KSh) *'}</label>
              <Input
                type="number"
                value={waiverValue}
                onChange={(e) => setWaiverValue(e.target.value)}
                placeholder={waiverType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                min="1"
                max={waiverType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
              placeholder="e.g. Scholarship, hardship, referral"
            />
          </div>
          {waiverValue && Number(waiverValue) > 0 && (
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              Waiver:{' '}
              <span className="font-medium text-foreground">
                {fmtKSh(waiverType === 'percentage'
                  ? Math.min(totalFee, (totalFee * Number(waiverValue)) / 100)
                  : Math.min(totalFee, Number(waiverValue)))}
              </span>{' '}
              off {fmtKSh(totalFee)} → new balance{' '}
              <span className="font-medium text-foreground">
                {fmtKSh(Math.max(0, totalFee - (waiverType === 'percentage'
                  ? Math.min(totalFee, (totalFee * Number(waiverValue)) / 100)
                  : Math.min(totalFee, Number(waiverValue))) - amountPaid))}
              </span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={applyWaiverMutation.isPending || !waiverValue || Number(waiverValue) <= 0 || (waiverType === 'percentage' && Number(waiverValue) > 100)}
              onClick={() => applyWaiverMutation.mutate()}
            >
              {applyWaiverMutation.isPending ? 'Applying…' : <><TrendingDown className="w-4 h-4 mr-1.5" /> Apply Waiver</>}
            </Button>
            <Button variant="outline" onClick={() => { setShowWaiverDialog(false); setWaiverValue(''); setWaiverReason('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  )
}
