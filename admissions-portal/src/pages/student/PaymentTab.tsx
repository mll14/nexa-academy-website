import { useEffect, useState } from 'react'
import PaystackPop from '@paystack/inline-js'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import { Dialog } from '../../components/ui/dialog'
import { DepositProgress } from '../../components/DepositProgress'
import { AlertCircle, CheckCircle2, CreditCard, History, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { statusText } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { FinancialReconciliation, Payment, PaymentPlanChangeRequest } from '../../types'

const MIN_PAYMENT = 100
const PLAN_OPTIONS = [
  { value: 'one-time', label: 'Full payment', note: 'Best value' },
  { value: '2-installments', label: '2 Instalments', note: '+10%' },
  { value: '3-installments', label: '3 Instalments', note: '+20%' },
] as const

type Plan = typeof PLAN_OPTIONS[number]['value']
type PaymentCategory = 'overview' | 'pay' | 'plan' | 'history'

const PAYMENT_TABS = [
  { value: 'overview', label: 'Overview', icon: WalletCards },
  { value: 'pay', label: 'Pay', icon: CreditCard },
  { value: 'plan', label: 'Payment Plan', icon: Send },
  { value: 'history', label: 'History', icon: History },
] as const

function resolvePlan(value?: string): Plan {
  const normalized = (value || '').toLowerCase()
  if (normalized.includes('3')) return '3-installments'
  if (normalized.includes('2')) return '2-installments'
  return 'one-time'
}

function calcPlan(basePrice: number, plan: Plan) {
  const inst2Per = Math.round((basePrice * 1.1) / 2 / 500) * 500
  const inst2Total = inst2Per * 2
  const inst3Per = Math.round((basePrice * 1.2) / 3 / 500) * 500
  const inst3Total = inst3Per * 3

  if (plan === 'one-time') {
    return { total: basePrice, per: basePrice, count: 1, label: 'Full payment', savings: inst3Total - basePrice }
  }
  if (plan === '3-installments') {
    return { total: inst3Total, per: inst3Per, count: 3, label: '3 instalments', savings: 0 }
  }
  return { total: inst2Total, per: inst2Per, count: 2, label: '2 instalments', savings: inst3Total - inst2Total }
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
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('overview')

  const primaryRecon = reconciliation?.items?.[0]
  const balance = Number(reconciliation?.amount_remaining ?? enrollment?.balance ?? 0)
  const amountPaid = Number(reconciliation?.amount_paid ?? enrollment?.amountPaid ?? 0)
  const totalFee = Number(reconciliation?.total_fee ?? enrollment?.amount ?? 0)
  const installmentAmount = Number(primaryRecon?.installment_amount ?? enrollment?.installmentAmount ?? 0)
  const selectedPlan = calcPlan(totalFee, requestPlan)
  const isFullyPaid = balance <= 0 && totalFee > 0
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
      setLoading(false)

      if (data.simulated) {
        toast.success('Payment recorded (simulated)')
        onPaymentDone()
        return
      }

      const publicKey = data.public_key ?? await api.getPaystackPublicKey()
      const reference = data.reference ?? data.data?.reference ?? data.access_code

      if (!publicKey || !reference) {
        toast.error('Missing Paystack credentials — check VITE_PAYSTACK_PUBLIC_KEY')
        return
      }

      const paystack = new PaystackPop()
      try {
        paystack.newTransaction({
          key: publicKey,
          email: user?.email ?? '',
          amount: entered * 100,
          currency: 'KES',
          ref: reference,
          access_code: data.access_code,
          onSuccess: async (transaction: { reference: string }) => {
            toast.loading('Verifying payment…')
            const verify = await api.verifyPayment(transaction.reference)
            toast.dismiss()
            if (verify.status === 'success' || verify.payment?.status === 'completed') {
              toast.success('Payment successful! 🎉')
              setAmount('')
              setVerifyError(null)
              onPaymentDone()
            } else {
              toast.dismiss()
              setVerifyError(transaction.reference)
            }
          },
          onCancel: () => toast('Payment cancelled'),
        })
      } catch {
        const authUrl = data.authorization_url ?? data.data?.authorization_url
        if (authUrl) {
          window.open(authUrl, '_blank')
          toast('Opened Paystack checkout in a new tab')
        } else {
          toast.error('Failed to open Paystack checkout')
        }
      }
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
      setPlanModalOpen(false)
      toast.success('Payment plan request sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request')
    } finally {
      setRequestingPlan(false)
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
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeCategory === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
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

              <Separator />

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Program Fee', value: totalFee },
                  { label: 'Paid', value: amountPaid },
                  { label: 'Balance', value: balance, highlight: !isFullyPaid && balance > 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-destructive' : ''}`}>
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

          {!pendingPlanRequest && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-semibold">Need a different payment plan?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose full payment, 2 instalments, or 3 instalments and send it to admissions for review.
                </p>
              </div>
              <Button onClick={() => setPlanModalOpen(true)} disabled={!enrollment?.enrollmentId || totalFee <= 0} className="gap-2 shrink-0">
                <WalletCards className="w-4 h-4" />
                Request change
              </Button>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      <Dialog
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Request payment plan change"
        description="Select a plan and confirm the instalment amount you want admissions to review."
      >
        <div className="space-y-5">
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
              <Input type="number" min={MIN_PAYMENT} value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Briefly explain why you need this payment plan" />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setPlanModalOpen(false)} disabled={requestingPlan}>
              Cancel
            </Button>
            <Button onClick={handlePlanRequest} disabled={requestingPlan || !enrollment?.enrollmentId || totalFee <= 0} className="gap-2">
              {requestingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Request {selectedPlan.label}
            </Button>
          </div>
        </div>
      </Dialog>

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
                      ? 'Pay any amount — enrollment unlocks once KSh 10,000 total is deposited'
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

      {activeCategory === 'history' && (
        <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">Payment History</h3>
          <Separator />
          {!payments.length ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            payments.map((p) => {
              const pid = p.payment_id || p.id
              const isRechecking = recheckingId === pid
              return (
                <div key={pid} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">KSh {parseFloat(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.payment_date ?? p.created_at).toLocaleDateString('en-KE')}
                      {p.payment_reference ? ` · Ref: ${p.payment_reference}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      p.status === 'completed' ? 'bg-success/10 text-success' :
                      p.status === 'pending' ? 'bg-warning/10 text-warning' :
                      p.status === 'processing' ? 'bg-blue-500/10 text-blue-600' :
                      p.status === 'refunded' ? 'bg-muted text-muted-foreground' :
                      'bg-destructive/10 text-destructive'
                    }>
                      {statusText(p.status)}
                    </Badge>
                    {(p.status === 'pending' || p.status === 'processing') && p.payment_reference && (
                      <button onClick={() => handleRecheck(p)} disabled={isRechecking} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                        {isRechecking ? 'Checking…' : 'Recheck'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
        </Card>
      )}
    </div>
  )
}
