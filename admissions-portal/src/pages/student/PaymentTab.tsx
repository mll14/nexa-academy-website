import { useEffect, useState } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import { Dialog } from '../../components/ui/dialog'
import { DepositProgress } from '../../components/DepositProgress'
import { SendReceiptButton } from '../../components/SendReceiptButton'
import { PaymentInstructions } from '../../components/PaymentInstructions'
import { AlertCircle, Banknote, CheckCircle2, CreditCard, History, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { statusText } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { FinancialReconciliation, ManualPaymentRequest, Payment, PaymentPlanChangeRequest, ReconciliationLedgerLine } from '../../types'

const MIN_PAYMENT = 100
const PLAN_OPTIONS = [
  { value: 'full', label: 'One-time Payment', note: 'Best discount' },
  { value: 'installment2', label: '2 Installments', note: '10% surcharge' },
  { value: 'installment3', label: '3 Installments', note: '20% surcharge' },
] as const

type Plan = typeof PLAN_OPTIONS[number]['value']
type PaymentCategory = 'overview' | 'pay' | 'plan' | 'manual' | 'history'

const PAYMENT_TABS = [
  { value: 'overview', label: 'Overview', icon: WalletCards },
  { value: 'pay', label: 'Pay', icon: CreditCard },
  { value: 'plan', label: 'Payment Plan', icon: Send },
  { value: 'manual', label: 'Record Payment', icon: Banknote },
  { value: 'history', label: 'History', icon: History },
] as const

const MANUAL_METHOD_OPTIONS = [
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'KCB', label: 'KCB Bank Transfer' },
  { value: 'Cash', label: 'Cash' },
  { value: 'M-Pesa', label: 'M-Pesa' },
]

const completedStatuses = ['completed', 'paid', 'success']

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString()
}

function paymentStatusClass(status: string) {
  if (completedStatuses.includes(status)) return 'bg-success/10 text-success'
  if (status === 'pending' || status === 'processing') return 'bg-warning/10 text-warning'
  if (status === 'refunded') return 'bg-muted text-muted-foreground'
  return 'bg-destructive/10 text-destructive'
}

function buildLedgerFallback(totalFee: number, payments: Payment[]): ReconciliationLedgerLine[] {
  let runningBalance = totalFee
  const lines: ReconciliationLedgerLine[] = totalFee > 0
    ? [{
        date: null,
        type: 'fee',
        description: 'Program fee',
        status: 'posted',
        debit: String(totalFee),
        credit: '0',
        balance: String(totalFee),
        applied: true,
      }]
    : []

  const sorted = [...payments].sort((a, b) => {
    const aDate = new Date(a.payment_date ?? a.created_at).getTime()
    const bDate = new Date(b.payment_date ?? b.created_at).getTime()
    return aDate - bDate
  })

  sorted.forEach((payment) => {
    const applied = completedStatuses.includes(payment.status)
    const credit = applied ? Number(payment.amount) : 0
    runningBalance = Math.max(0, runningBalance - credit)
    lines.push({
      date: payment.payment_date ?? payment.created_at,
      type: 'payment',
      description: payment.description || payment.program_name || 'Payment received',
      program_name: payment.program_name,
      reference: payment.payment_reference || payment.transaction_id || payment.payment_id || payment.id,
      status: payment.status,
      debit: '0',
      credit: String(credit),
      balance: String(runningBalance),
      applied,
    })
  })

  return lines
}

function resolvePlan(value?: string): Plan {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'installment3' || normalized.includes('3')) return 'installment3'
  if (normalized === 'installment2' || normalized.includes('2')) return 'installment2'
  return 'full'
}

function calcPlan(basePrice: number, plan: Plan) {
  const inst2Per = Math.round((basePrice * 1.1) / 2 / 500) * 500
  const inst2Total = inst2Per * 2
  const inst3Per = Math.round((basePrice * 1.2) / 3 / 500) * 500
  const inst3Total = inst3Per * 3

  if (plan === 'full') {
    return { total: basePrice, per: basePrice, count: 1, label: 'One-time Payment', savings: inst3Total - basePrice }
  }
  if (plan === 'installment3') {
    return { total: inst3Total, per: inst3Per, count: 3, label: '3 Installments', savings: 0 }
  }
  return { total: inst2Total, per: inst2Per, count: 2, label: '2 Installments', savings: inst3Total - inst2Total }
}

interface Enrollment {
  enrollmentId?: string
  programId?: string | null
  amount: number
  amountPaid: number
  balance: number
  paymentStatus?: string
  paymentPlan?: string
  installmentAmount?: number | null
}

interface Props {
  enrollment: Enrollment | null
  payments: Payment[]
  onPaymentDone: () => void
  applicationStatus?: string
  depositedAmount?: number
  reconciliation?: FinancialReconciliation | null
}

export function PaymentTab({ enrollment, payments, onPaymentDone, applicationStatus = '', depositedAmount = 0, reconciliation }: Props) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [recheckingId, setRecheckingId] = useState<string | null>(null)
  const [planRequests, setPlanRequests] = useState<PaymentPlanChangeRequest[]>([])
  const [requestPlan, setRequestPlan] = useState<Plan>(resolvePlan(enrollment?.paymentPlan))
  const [requestAmount, setRequestAmount] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestingPlan, setRequestingPlan] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('overview')

  const todayIso = new Date().toISOString().slice(0, 10)
  const [manualRequests, setManualRequests] = useState<ManualPaymentRequest[]>([])
  const [manualAmount, setManualAmount] = useState('')
  const [manualMethod, setManualMethod] = useState('Bank Transfer')
  const [manualDate, setManualDate] = useState(todayIso)
  const [manualReference, setManualReference] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [submittingManual, setSubmittingManual] = useState(false)

  const primaryRecon = reconciliation?.items?.[0]
  const balance = Number(reconciliation?.amount_remaining ?? enrollment?.balance ?? 0)
  const amountPaid = Number(reconciliation?.amount_paid ?? enrollment?.amountPaid ?? 0)
  const totalFee = Number(reconciliation?.total_fee ?? enrollment?.amount ?? 0)
  const totalDiscount = Number(reconciliation?.total_discount ?? 0)
  const installmentAmount = Number(primaryRecon?.installment_amount ?? enrollment?.installmentAmount ?? 0)
  const selectedPlan = calcPlan(totalFee, requestPlan)
  const isFullyPaid = balance <= 0 && totalFee > 0
  const ledgerLines = reconciliation?.ledger?.length
    ? reconciliation.ledger
    : buildLedgerFallback(totalFee, payments)
  const entered = Number(amount)
  const amountValid = entered >= MIN_PAYMENT && entered <= balance && entered > 0
  const pendingPlanRequest = planRequests.find((r) => r.status === 'pending')

  useEffect(() => {
    if (!enrollment?.enrollmentId) return
    api.getPaymentPlanRequests({ enrollment: enrollment.enrollmentId })
      .then(setPlanRequests)
      .catch(() => {})
  }, [enrollment?.enrollmentId])

  useEffect(() => {
    api.getManualPaymentRequests()
      .then(setManualRequests)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (installmentAmount > 0 && !amount && balance > 0) {
      setAmount(String(Math.min(installmentAmount, balance)))
    }
  }, [installmentAmount, balance, amount])

  useEffect(() => {
    if (totalFee <= 0) return
    const suggested = Math.min(selectedPlan.per, balance || selectedPlan.per)
    setRequestAmount(String(selectedPlan.per))
    if (!amount && suggested > 0) setAmount(String(suggested))
  }, [requestPlan, selectedPlan.per, totalFee, balance, amount])

  const handleRecheck = async (payment: Payment) => {
    const id = payment.payment_id || payment.id
    setRecheckingId(id)
    try {
      const result = await api.checkPaymentStatus(id)
      if (result.payment?.status === 'completed') {
        toast.success('Payment confirmed!')
        onPaymentDone()
      } else {
        toast(`Still pending (${result.paystack_status ?? 'unknown'}). Try again later.`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not check status')
    } finally {
      setRecheckingId(null)
    }
  }

  const handlePay = async () => {
    if (!amountValid) {
      toast.error(entered < MIN_PAYMENT ? `Minimum payment is KSh ${MIN_PAYMENT}` : 'Amount exceeds balance')
      return
    }
    setLoading(true)
    try {
      const data = await api.initializePayment({
        amount: entered,
        programId: enrollment?.programId,
        paymentType: 'installment',
        email: user?.email,
      })

      if (data.simulated) {
        toast.success('Payment recorded (simulated)')
        onPaymentDone()
        setLoading(false)
        return
      }

      const publicKey = data.public_key ?? await api.getPaystackPublicKey()

      if (!publicKey) {
        toast.error('Payment configuration missing — contact admissions')
        setLoading(false)
        return
      }

      setLoading(false)

      const { default: PaystackPop } = await import('@paystack/inline-js')
      const paystack = new PaystackPop()
      paystack.newTransaction({
        key: publicKey,
        ...(data.access_code
          ? { access_code: data.access_code }
          : {
              email: user?.email ?? '',
              amount: entered * 100,
              currency: 'KES',
              ref: data.reference ?? data.data?.reference,
            }
        ),
        onSuccess: async (transaction: { reference: string }) => {
          const toastId = toast.loading('Verifying payment…')
          try {
            const verify = await api.verifyPayment(transaction.reference)
            toast.dismiss(toastId)
            if (verify.status === 'success' || verify.payment?.status === 'completed') {
              toast.success('Payment successful!')
              setAmount('')
              setVerifyError(null)
              onPaymentDone()
            } else {
              setVerifyError(transaction.reference)
            }
          } catch {
            toast.dismiss(toastId)
            setVerifyError(transaction.reference)
          }
        },
        onCancel: () => toast('Payment cancelled'),
        onError: (error: { message?: string }) => {
          toast.error(error?.message ?? 'Payment failed. Please try again.')
        },
      })
    } catch (e) {
      setLoading(false)
      toast.error(e instanceof Error ? e.message : 'Could not initialize payment')
    }
  }

  const handlePlanRequest = async () => {
    const requested = Number(requestAmount)
    if (!enrollment?.enrollmentId) {
      toast.error('Payment plan requests are available after enrollment')
      return
    }
    if (!requestPlan || requested <= 0) {
      toast.error('Choose a plan and enter a valid installment amount')
      return
    }
    setRequestingPlan(true)
    try {
      const created = await api.createPaymentPlanRequest({
        enrollmentId: enrollment.enrollmentId,
        requestedPaymentPlan: selectedPlan.label,
        requestedInstallmentAmount: requested,
        reason: requestReason,
      })
      setPlanRequests((prev) => [created, ...prev])
      setRequestReason('')
      toast.success('Payment plan request sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request')
    } finally {
      setRequestingPlan(false)
    }
  }

  const handleManualRequest = async () => {
    const amountNum = Number(manualAmount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!manualMessage.trim()) {
      toast.error('The confirmation message from your bank/service is required as proof')
      return
    }
    setSubmittingManual(true)
    try {
      const created = await api.createManualPaymentRequest({
        amount: amountNum,
        paymentMethod: manualMethod,
        paymentDate: manualDate,
        reference: manualReference,
        providerMessage: manualMessage,
        programId: enrollment?.programId,
      })
      setManualRequests((prev) => [created, ...prev])
      setManualAmount('')
      setManualReference('')
      setManualMessage('')
      toast.success('Reconciliation request sent for review')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request')
    } finally {
      setSubmittingManual(false)
    }
  }

  const retryVerify = async (ref: string) => {
    const id = toast.loading('Verifying payment…')
    try {
      const verify = await api.verifyPayment(ref)
      toast.dismiss(id)
      if (verify.status === 'success' || verify.payment?.status === 'completed') {
        toast.success('Payment confirmed!')
        setVerifyError(null)
        setAmount('')
        onPaymentDone()
      } else {
        toast.error('Still unverified — please contact admissions')
      }
    } catch {
      toast.dismiss(id)
      toast.error('Verification failed — please try again')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Program Fee', value: `KSh ${totalFee.toLocaleString()}` },
          { label: 'Total Paid', value: `KSh ${amountPaid.toLocaleString()}` },
          { label: 'Balance Due', value: `KSh ${balance.toLocaleString()}`, highlight: !isFullyPaid },
        ].map(({ label, value, highlight }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`font-bold text-lg ${highlight ? 'text-destructive' : ''}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex border-b border-border min-w-max">
          {PAYMENT_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value as PaymentCategory)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeCategory === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeCategory === 'overview' && (
        <div className="space-y-5">
          <DepositProgress depositedAmount={depositedAmount} applicationStatus={applicationStatus} totalFee={totalFee} />

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <WalletCards className="w-4 h-4 text-primary" />
                  Fee Summary
                </h3>
                {reconciliation?.items?.length ? (
                  <button
                    onClick={() => setReconciliationModalOpen(true)}
                    className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                  >
                    Full details
                  </button>
                ) : null}
              </div>

              {totalFee > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>KSh {amountPaid.toLocaleString()} paid</span>
                    <span>KSh {totalFee.toLocaleString()} total</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, totalFee > 0 ? (amountPaid / totalFee) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                  <span className="text-sm text-primary font-medium">Fee waiver applied</span>
                  <span className="text-sm font-bold text-primary">− KSh {totalDiscount.toLocaleString()}</span>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Program Fee', value: totalFee },
                  { label: 'Paid', value: amountPaid },
                  { label: 'Balance', value: balance, highlight: !isFullyPaid && balance > 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className={`text-xs sm:text-sm font-bold mt-0.5 break-words ${highlight ? 'text-destructive' : ''}`}>
                      KSh {value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {enrollment?.paymentPlan && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment plan</span>
                    <span className="font-semibold">{enrollment.paymentPlan}</span>
                  </div>
                  {installmentAmount > 0 && !isFullyPaid && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next installment</span>
                      <span className="font-semibold">KSh {installmentAmount.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}

              {isFullyPaid && (
                <div className="flex items-center gap-2 text-success text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  All fees settled
                </div>
              )}
            </CardContent>
          </Card>

          {!isFullyPaid && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  How to pay your fees
                </h3>
                <PaymentInstructions />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={reconciliationModalOpen}
        onClose={() => setReconciliationModalOpen(false)}
        title="Financial Reconciliation"
        description="Current fee reconciliation based on completed payments and your payment plan."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Fee', value: totalFee },
              { label: 'Paid', value: amountPaid },
              { label: 'Remaining', value: balance },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold mt-1">KSh {item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {totalDiscount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
              <span className="text-sm text-primary font-medium">Fee waiver</span>
              <span className="text-sm font-bold text-primary">− KSh {totalDiscount.toLocaleString()}</span>
            </div>
          )}

          <Separator />

          {reconciliation?.items?.length ? (
            <div className="divide-y divide-border">
              {reconciliation.items.map((item) => (
                <div key={item.enrollment_id ?? item.program_id ?? item.program_name} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.program_name || 'Program fees'}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.payment_plan || 'Standard plan'}
                        {item.installment_amount ? ` · Installment KSh ${Number(item.installment_amount).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <Badge className={item.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                      {item.status === 'paid' ? 'Settled' : 'Outstanding'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-semibold">KSh {Number(item.total_fee).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-semibold">KSh {Number(item.amount_paid).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold">KSh {Number(item.amount_remaining).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reconciliation record yet.</p>
          )}
        </div>
      </Dialog>

      {activeCategory === 'plan' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <WalletCards className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Payment Plan</h3>
                </div>
                {pendingPlanRequest && <Badge className="bg-warning/10 text-warning">Pending review</Badge>}
              </div>
              <Separator />
              <div className="rounded-xl border border-border p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Current plan</p>
                <p className="text-sm font-semibold">{enrollment?.paymentPlan || 'Standard plan'}</p>
                {installmentAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Recommended installment: KSh {installmentAmount.toLocaleString()}
                  </p>
                )}
              </div>

              {planRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request history</p>
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {planRequests.map((r) => (
                      <div key={r.request_id} className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {r.requested_payment_plan} · KSh {Number(r.requested_installment_amount).toLocaleString()}
                          </p>
                          {r.admin_notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.admin_notes}</p>
                          )}
                        </div>
                        <Badge className={
                          r.status === 'approved' ? 'bg-success/10 text-success shrink-0' :
                          r.status === 'rejected' ? 'bg-destructive/10 text-destructive shrink-0' :
                          'bg-warning/10 text-warning shrink-0'
                        }>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!enrollment?.enrollmentId ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Plan changes available after enrollment</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once your KSh 10,000 deposit is processed and your enrollment is confirmed, you'll be able to request a payment plan change here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : pendingPlanRequest ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Plan change request pending</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your request for <span className="font-medium">{pendingPlanRequest.requested_payment_plan}</span> at KSh {Number(pendingPlanRequest.requested_installment_amount).toLocaleString()} per instalment is being reviewed by admissions. You will be notified once a decision is made.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold">Request a plan change</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the plan you want and admissions will review your request.
                  </p>
                </div>
                <Separator />

                <div className="grid md:grid-cols-3 gap-3">
                  {PLAN_OPTIONS.map((plan) => {
                    const summary = calcPlan(totalFee, plan.value)
                    const selected = requestPlan === plan.value
                    return (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => setRequestPlan(plan.value)}
                        className={`text-left rounded-xl border p-4 transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-background hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{plan.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{plan.note}</p>
                          </div>
                          {selected && <Badge className="bg-primary/10 text-primary">Selected</Badge>}
                        </div>
                        <div className="mt-4 space-y-1 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold">KSh {summary.total.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{summary.count === 1 ? 'Amount due' : 'Per instalment'}</span>
                            <span className="font-semibold">KSh {summary.per.toLocaleString()}</span>
                          </div>
                          {summary.savings > 0 && (
                            <div className="flex justify-between gap-3 text-success">
                              <span>Saves vs 3 instalments</span>
                              <span className="font-semibold">KSh {summary.savings.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="grid sm:grid-cols-[180px_1fr] gap-3">
                  <div className="space-y-1.5">
                    <Label>Installment (KSh)</Label>
                    <Input
                      type="number"
                      min={MIN_PAYMENT}
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason</Label>
                    <Textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Briefly explain why you need this payment plan"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handlePlanRequest}
                    disabled={requestingPlan}
                    className="gap-2"
                  >
                    {requestingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Request {selectedPlan.label}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeCategory === 'pay' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Make a Payment</h3>
                  {isFullyPaid && <Badge className="bg-success/10 text-success">Fully Paid</Badge>}
                </div>
                {!isFullyPaid && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Balance: KSh {balance.toLocaleString()} · Suggested: KSh {Math.min(selectedPlan.per, balance).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {isFullyPaid ? (
              <div className="flex items-center gap-2 text-success text-sm font-semibold py-2">
                <CheckCircle2 className="w-4 h-4" />
                Your program fees are fully paid. Thank you!
              </div>
            ) : (
              <>
                {verifyError && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Payment verification pending</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your payment may have gone through. Reference: <code className="font-mono">{verifyError}</code>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => retryVerify(verifyError)}>
                        Retry verification
                      </Button>
                      <a
                        href="mailto:admissions@nexaacademy.co.ke?subject=Payment%20verification"
                        className="text-xs text-primary underline self-center"
                      >
                        Contact support
                      </a>
                    </div>
                  </div>
                )}

                {/* Quick-amount preset buttons */}
                {(() => {
                  const depositLeft = Math.max(0, 10_000 - (depositedAmount ?? 0))
                  const isInterviewCompleted = applicationStatus === 'interview_completed'
                  const rawPresets: number[] = []
                  if (isInterviewCompleted && depositLeft > 0) rawPresets.push(depositLeft)
                  if (installmentAmount > 0 && !rawPresets.includes(installmentAmount)) rawPresets.push(installmentAmount)
                  if (!rawPresets.includes(5_000) && balance >= 5_000) rawPresets.push(5_000)
                  if (!rawPresets.includes(10_000) && balance >= 10_000) rawPresets.push(10_000)
                  const validPresets = rawPresets.filter(p => p <= balance && p > 0).slice(0, 4)
                  if (validPresets.length === 0) return null
                  return (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Quick amounts</p>
                      <div className="flex flex-wrap gap-2">
                        {validPresets.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAmount(String(p))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              amount === String(p)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted border-transparent hover:border-border hover:bg-muted/70'
                            }`}
                          >
                            KSh {p.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Amount (KSh)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    placeholder={selectedPlan.per > 0 ? `Suggested KSh ${Math.min(selectedPlan.per, balance).toLocaleString()}` : `Min KSh ${MIN_PAYMENT}`}
                    value={amount}
                    min={MIN_PAYMENT}
                    max={balance}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {applicationStatus === 'interview_completed'
                      ? 'Pay any amount — enrollment confirms once KSh 10,000 total is deposited'
                      : `Outstanding balance: KSh ${balance.toLocaleString()}`}
                  </p>
                </div>

                <Button onClick={handlePay} disabled={loading || !amountValid} className="w-full gap-2">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                    : <><CreditCard className="w-4 h-4" /> Pay KSh {entered > 0 ? entered.toLocaleString() : '—'} via Paystack</>
                  }
                </Button>
                <p className="text-xs text-center text-muted-foreground">Secured by Paystack · M-Pesa, Card & Bank supported</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeCategory === 'manual' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Paid outside the portal?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If you paid via KCB bank transfer, cash, or M-Pesa directly, submit the details and the
                    confirmation message you received. Admissions will review and post it to your account.
                  </p>
                </div>
              </div>

              <PaymentInstructions showOnline={false} />
              <Separator />

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (KSh)</Label>
                  <Input
                    type="number"
                    min={MIN_PAYMENT}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="e.g. 10000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Select value={manualMethod} onChange={setManualMethod} options={MANUAL_METHOD_OPTIONS} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment date</Label>
                  <Input type="date" value={manualDate} max={todayIso} onChange={(e) => setManualDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference (optional)</Label>
                  <Input
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    placeholder="e.g. bank/M-Pesa code"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Confirmation message *</Label>
                <Textarea
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Paste the exact message you received from the bank or service confirming this payment"
                />
                <p className="text-xs text-muted-foreground">Required — this is your proof of payment.</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleManualRequest} disabled={submittingManual} className="gap-2">
                  {submittingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for review
                </Button>
              </div>
            </CardContent>
          </Card>

          {manualRequests.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your requests</p>
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {manualRequests.map((r) => (
                    <div key={r.request_id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          KSh {Number(r.amount).toLocaleString()} · {r.payment_method}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {new Date(r.payment_date).toLocaleDateString('en-KE')}
                          {r.reference ? ` · ${r.reference}` : ''}
                        </p>
                        {r.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.admin_notes}</p>
                        )}
                      </div>
                      <Badge className={
                        r.status === 'approved' ? 'bg-success/10 text-success shrink-0' :
                        r.status === 'rejected' ? 'bg-destructive/10 text-destructive shrink-0' :
                        'bg-warning/10 text-warning shrink-0'
                      }>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeCategory === 'history' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold">Payment Reconciliation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fees are debits. Completed payments are credits. Pending payments are shown but not applied to the balance.
                </p>
              </div>
              <Badge className={isFullyPaid ? 'bg-success/10 text-success self-start' : 'bg-warning/10 text-warning self-start'}>
                {isFullyPaid ? 'Settled' : `KSh ${balance.toLocaleString()} remaining`}
              </Badge>
            </div>
            <Separator />

            {!ledgerLines.length ? (
              <p className="text-sm text-muted-foreground">No payment history yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Details</th>
                      <th className="px-4 py-3 text-right font-medium">Fee Charged</th>
                      <th className="px-4 py-3 text-right font-medium">Payment Made</th>
                      <th className="px-4 py-3 text-right font-medium">Balance</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerLines.map((line, index) => {
                      const matchingPayment = payments.find((payment) => {
                        const ref = payment.payment_reference || payment.transaction_id || payment.payment_id || payment.id
                        return line.reference && ref === line.reference
                      })
                      const canRecheck = matchingPayment && (matchingPayment.status === 'pending' || matchingPayment.status === 'processing') && matchingPayment.payment_reference
                      const isRechecking = matchingPayment && recheckingId === (matchingPayment.payment_id || matchingPayment.id)
                      return (
                        <tr key={`${line.type}-${line.reference ?? line.description}-${index}`} className={!line.applied ? 'bg-muted/20' : undefined}>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {line.date ? new Date(line.date).toLocaleDateString('en-KE') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{line.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {line.reference ? `Ref: ${line.reference}` : line.type === 'fee' ? 'Fee posted' : 'No reference'}
                              {!line.applied && ' · Not applied'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {Number(line.debit) > 0 ? `KSh ${money(line.debit)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-success">
                            {Number(line.credit) > 0 ? `KSh ${money(line.credit)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">KSh {money(line.balance)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge className={line.type === 'fee' || line.type === 'waiver' ? 'bg-primary/10 text-primary' : paymentStatusClass(line.status)}>
                                {line.type === 'fee' ? 'Fee' : line.type === 'waiver' ? 'Waiver' : statusText(line.status)}
                              </Badge>
                              {canRecheck && (
                                <button onClick={() => handleRecheck(matchingPayment)} disabled={isRechecking} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50">
                                  <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                                  {isRechecking ? 'Checking…' : 'Recheck'}
                                </button>
                              )}
                              {matchingPayment?.status === 'completed' && (
                                <SendReceiptButton
                                  paymentId={matchingPayment.payment_id}
                                  label="Receipt"
                                  className="h-7 px-2 text-[11px]"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr>
                      <td className="px-4 py-3 font-semibold" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right font-semibold">KSh {totalFee.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-success">KSh {amountPaid.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-bold ${balance > 0 ? 'text-destructive' : 'text-success'}`}>
                        KSh {balance.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
