import { useState } from 'react'
import PaystackPop from '@paystack/inline-js'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { DepositProgress } from '../../components/DepositProgress'
import { CheckCircle2, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { statusText } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Payment } from '../../types'

const MIN_PAYMENT = 100

interface Enrollment {
  programId?: string | null
  amount: number
  amountPaid: number
  balance: number
  paymentStatus?: string
}

interface Props {
  enrollment: Enrollment | null
  payments: Payment[]
  onPaymentDone: () => void
  applicationStatus?: string
  depositedAmount?: number
}

export function PaymentTab({ enrollment, payments, onPaymentDone, applicationStatus = '', depositedAmount = 0 }: Props) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [recheckingId, setRecheckingId] = useState<string | null>(null)

  const balance = Number(enrollment?.balance ?? 0)
  const amountPaid = Number(enrollment?.amountPaid ?? 0)
  const totalFee = Number(enrollment?.amount ?? 0)
  const isFullyPaid = balance <= 0 && totalFee > 0
  const entered = Number(amount)
  const amountValid = entered >= MIN_PAYMENT && entered <= balance && entered > 0

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
              onPaymentDone()
            } else {
              toast.error('Verification failed — contact support')
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

  return (
    <div className="space-y-5">
      <DepositProgress depositedAmount={depositedAmount} applicationStatus={applicationStatus} totalFee={totalFee} />

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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Make a Payment</h3>
            {isFullyPaid && <Badge className="bg-success/10 text-success">Fully Paid ✓</Badge>}
          </div>
          <Separator />
          {isFullyPaid ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <p className="font-semibold text-lg">All fees settled</p>
              <p className="text-sm text-muted-foreground">Your program fees are fully paid. Thank you!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount (KSh)</Label>
                <Input id="pay-amount" type="number" placeholder={`Min KSh ${MIN_PAYMENT}`} value={amount} min={MIN_PAYMENT} max={balance} onChange={(e) => setAmount(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {applicationStatus === 'interview_completed'
                    ? 'Pay any amount — enrollment unlocks once KSh 10,000 total is deposited'
                    : `Outstanding balance: KSh ${balance.toLocaleString()}`}
                </p>
              </div>
              <Button onClick={handlePay} disabled={loading || isFullyPaid || !amountValid} className="w-full gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><CreditCard className="w-4 h-4" /> Pay KSh {entered > 0 ? entered.toLocaleString() : '—'} via Paystack</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Secured by Paystack · M-Pesa, Card & Bank supported</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <Badge className={p.status === 'completed' ? 'bg-success/10 text-success' : p.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}>
                      {statusText(p.status)}
                    </Badge>
                    {p.status === 'pending' && p.payment_reference && (
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
    </div>
  )
}
