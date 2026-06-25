import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Video,
  Wallet,
} from 'lucide-react'
import { StudentLayout } from '../../components/StudentLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Separator } from '../../components/ui/separator'
import { ProcessTracker } from '../../components/ProcessTracker'
import { DepositProgress } from '../../components/DepositProgress'
import { PaymentTab } from './PaymentTab'
import { useAuth } from '../../context/AuthContext'
import { useInterval } from '../../hooks/useInterval'
import * as api from '../../lib/api'
import { statusText } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Application, FinancialReconciliation, InterviewSlot, Notification, Payment } from '../../types'

interface DashEnrollment {
  enrollmentId?: string
  programName: string
  programId: string | null
  amount: number
  amountPaid: number
  balance: number
  status: string
  paymentStatus: string
  paymentPlan?: string
  installmentAmount?: number | null
}

type StudentSection = 'dashboard' | 'application' | 'payments' | 'notifications'

function greeting(name: string) {
  const h = new Date().getHours()
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${prefix}, ${name}`
}

function statusConfig(status: string) {
  switch (status) {
    case 'approved':
    case 'interview_scheduled':
    case 'interview_completed':
    case 'enrolled':
      return 'bg-success/10 text-success border-success/20'
    case 'pending':
    case 'reviewed':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'primary' | 'success' | 'warning'
}) {
  const tones = {
    default: 'bg-muted text-muted-foreground ring-border',
    primary: 'bg-primary/10 text-primary ring-primary/10',
    success: 'bg-success/10 text-success ring-success/10',
    warning: 'bg-warning/10 text-warning ring-warning/10',
  }
  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4 ring-1 ring-border">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
        <p className="font-heading text-xl font-bold mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function NotificationItem({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  return (
    <div className={`flex gap-3 px-5 py-4 transition-colors ${n.read ? 'bg-card' : 'bg-primary/5'}`}>
      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-muted' : 'bg-primary/15'}`}>
        <Bell className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{n.title}</p>
        {n.message && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>}
        <p className="text-xs text-muted-foreground mt-1.5">
          {new Date((n.timestamp ?? n.created_at) as string).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
      {!n.read && (
        <button onClick={() => onMarkRead(n.id)} className="shrink-0 text-xs text-primary font-medium hover:underline">
          Mark read
        </button>
      )}
    </div>
  )
}

// ─── Next Step Hero Card ─────────────────────────────────────────────────────

interface NextStepProps {
  appStatus: string
  interviewSlot: InterviewSlot | null
  enrollment: DashEnrollment | null
  depositedAmount: number
  navigate: ReturnType<typeof useNavigate>
}

function NextStepCard({ appStatus, interviewSlot, enrollment, depositedAmount, navigate }: NextStepProps) {
  const interviewDate = interviewSlot?.chosen_time
    ? new Date(interviewSlot.chosen_time).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' })
    : null

  const hoursUntilInterview = interviewSlot?.chosen_time
    ? (new Date(interviewSlot.chosen_time).getTime() - Date.now()) / 3_600_000
    : 0
  const daysUntil = Math.floor(hoursUntilInterview / 24)
  const countdownText = hoursUntilInterview <= 0 ? null
    : daysUntil >= 1 ? `That's in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — you've got this!`
    : hoursUntilInterview >= 1 ? `That's in ${Math.ceil(hoursUntilInterview)} hour${Math.ceil(hoursUntilInterview) === 1 ? '' : 's'} — get ready!`
    : 'Your interview is starting very soon!'

  const balance = enrollment?.balance ?? 0
  const isFullyPaid = balance <= 0 && (enrollment?.amount ?? 0) > 0
  const installmentAmount = enrollment?.installmentAmount ?? null
  const meetUrl = interviewSlot?.meet_url || interviewSlot?.zoom_link
  const depositLeft = Math.max(0, 10_000 - depositedAmount)

  if (!appStatus) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Welcome to Nexa Academy</p>
          <h2 className="font-heading text-xl font-bold mt-1">Start your coding journey</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Submit your application and take the first step toward a career in tech.</p>
        </div>
        <Button onClick={() => navigate({ to: '/apply' } as never)} size="lg" className="gap-2 shrink-0">
          Apply Now <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (appStatus === 'pending' || appStatus === 'reviewed') {
    return (
      <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
          <Clock className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-warning uppercase tracking-wide">Application Under Review</p>
          <h2 className="font-heading text-xl font-bold mt-0.5">We're reviewing your application</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Our admissions team will get back to you within <strong>2–3 business days</strong>. No action needed from you right now — sit tight!
          </p>
        </div>
      </div>
    )
  }

  if (appStatus === 'approved') {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-success uppercase tracking-wide">Approved — Action Required</p>
          <h2 className="font-heading text-xl font-bold mt-0.5">Book your admissions interview</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Congratulations! The next step is a <strong>30-minute chat</strong> with our team — no technical test, just a conversation about your goals.
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/student/application' } as never)} size="lg" className="gap-2 shrink-0">
          Schedule Interview <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (appStatus === 'interview_scheduled' && interviewSlot) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Interview Booked</p>
            <h2 className="font-heading text-xl font-bold mt-0.5">{interviewDate} EAT</h2>
            {countdownText && <p className="text-sm text-muted-foreground mt-0.5">{countdownText}</p>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          {meetUrl ? (
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Video className="w-4 h-4" />
              Join Google Meet
            </a>
          ) : null}
          <Button
            variant={meetUrl ? 'outline' : 'default'}
            onClick={() => navigate({ to: '/student/application' } as never)}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Details & Reschedule
          </Button>
        </div>
      </div>
    )
  }

  if (appStatus === 'interview_completed') {
    return (
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-success uppercase tracking-wide">Interview Passed</p>
            <h2 className="font-heading text-xl font-bold mt-0.5">Secure your place with a deposit</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Make a deposit of <strong>KSh 10,000</strong> to confirm your enrollment.
              {depositLeft < 10_000 && depositLeft > 0 && ` You've already paid KSh ${depositedAmount.toLocaleString()} — just KSh ${depositLeft.toLocaleString()} more to go!`}
              {' '}This counts toward your total program fee — it's not an extra charge.
            </p>
          </div>
        </div>
        <DepositProgress depositedAmount={depositedAmount} applicationStatus="interview_completed" />
        {depositedAmount < 10_000 && (
          <Button onClick={() => navigate({ to: '/student/payments' } as never)} size="lg" className="w-full gap-2">
            <CreditCard className="w-4 h-4" />
            Pay KSh {depositLeft.toLocaleString()} Deposit <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  if (appStatus === 'enrolled') {
    if (isFullyPaid) {
      return (
        <div className="bg-success/5 border border-success/20 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs font-semibold text-success uppercase tracking-wide">All Fees Settled</p>
            <h2 className="font-heading text-xl font-bold mt-0.5">See you in class!</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Your fees are fully paid. Check your email for your LMS login link and class schedule.
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Enrolled</p>
          <h2 className="font-heading text-xl font-bold mt-0.5">Keep up with your payments</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Outstanding: <strong>KSh {balance.toLocaleString()}</strong>
            {installmentAmount && installmentAmount > 0 ? ` · Next instalment: KSh ${installmentAmount.toLocaleString()}` : ''}
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/student/payments' } as never)} size="lg" className="gap-2 shrink-0">
          <CreditCard className="w-4 h-4" />
          Make Payment
        </Button>
      </div>
    )
  }

  return null
}

// ─── Quick Pay Widget ─────────────────────────────────────────────────────────

interface QuickPayProps {
  balance: number
  installmentAmount: number | null | undefined
  applicationStatus: string
  depositedAmount: number
  userEmail: string | undefined
  programId: string | null | undefined
  onPaymentDone: () => void
  onViewFullDetails: () => void
}

function QuickPayCard({
  balance,
  installmentAmount,
  applicationStatus,
  depositedAmount,
  userEmail,
  programId,
  onPaymentDone,
  onViewFullDetails,
}: QuickPayProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const isInterviewCompleted = applicationStatus === 'interview_completed'
  const depositLeft = Math.max(0, 10_000 - depositedAmount)

  const rawPresets: number[] = []
  if (isInterviewCompleted && depositLeft > 0) rawPresets.push(depositLeft)
  if (installmentAmount && installmentAmount > 0 && !rawPresets.includes(installmentAmount)) rawPresets.push(installmentAmount)
  if (!rawPresets.includes(5_000) && balance >= 5_000) rawPresets.push(5_000)
  if (!rawPresets.includes(10_000) && balance >= 10_000) rawPresets.push(10_000)
  const validPresets = rawPresets.filter(p => p <= balance && p > 0).slice(0, 4)

  const entered = Number(amount)
  const valid = entered >= 100 && entered <= balance && entered > 0

  const pay = async () => {
    if (!valid) {
      toast.error(entered < 100 ? 'Minimum payment is KSh 100' : 'Amount exceeds your outstanding balance')
      return
    }
    setLoading(true)
    try {
      const data = await api.initializePayment({
        amount: entered,
        programId,
        paymentType: 'installment',
        email: userEmail,
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
        toast.error('Payment setup failed. Please try again or use the full Payments page.')
        return
      }

      const { default: PaystackPop } = await import('@paystack/inline-js')
      const paystack = new PaystackPop()
      try {
        paystack.newTransaction({
          key: publicKey,
          email: userEmail ?? '',
          amount: entered * 100,
          currency: 'KES',
          ref: reference,
          access_code: data.access_code,
          onSuccess: async (transaction: { reference: string }) => {
            toast.loading('Verifying your payment…')
            const verify = await api.verifyPayment(transaction.reference)
            toast.dismiss()
            if (verify.status === 'success' || verify.payment?.status === 'completed') {
              toast.success('Payment successful!')
              setAmount('')
              onPaymentDone()
            } else {
              toast.error('Verification is still pending — check Payment History')
            }
          },
          onCancel: () => toast('Payment cancelled'),
        })
      } catch {
        const authUrl = data.authorization_url ?? data.data?.authorization_url
        if (authUrl) {
          window.open(authUrl, '_blank')
          toast('Opened payment checkout in a new tab')
        } else {
          toast.error('Could not open payment checkout — try the Payments page')
        }
      }
    } catch (e) {
      setLoading(false)
      toast.error(e instanceof Error ? e.message : 'Could not start payment')
    }
  }

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Quick Pay
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isInterviewCompleted && depositLeft > 0
              ? `KSh ${depositLeft.toLocaleString()} needed to confirm your enrollment`
              : `Outstanding balance: KSh ${balance.toLocaleString()}`}
          </p>
        </div>
        <button onClick={onViewFullDetails} className="text-xs text-primary hover:underline shrink-0 font-medium">
          Full details →
        </button>
      </div>

      {validPresets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {validPresets.map(p => (
            <button
              key={p}
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
      )}

      <div className="space-y-1.5">
        <Input
          type="number"
          placeholder={`Enter amount (KSh) — max KSh ${balance.toLocaleString()}`}
          value={amount}
          min={100}
          max={balance}
          onChange={e => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Minimum KSh 100 · M-Pesa, Card & Bank supported</p>
      </div>

      <Button onClick={pay} disabled={loading || !valid} className="w-full gap-2">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
          : <><CreditCard className="w-4 h-4" /> Pay KSh {entered > 0 ? entered.toLocaleString() : '—'} via Paystack</>
        }
      </Button>
      <p className="text-xs text-center text-muted-foreground">Secured by Paystack</p>
    </div>
  )
}

// ─── Data hook ───────────────────────────────────────────────────────────────

function useStudentData() {
  const { user } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [interviewSlot, setInterviewSlot] = useState<InterviewSlot | null>(null)
  const [enrollment, setEnrollment] = useState<DashEnrollment | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [reconciliation, setReconciliation] = useState<FinancialReconciliation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [profile, notifs, paymentsRes, enrollmentsRes, reconciliationRes] = await Promise.all([
        api.getProfile(),
        api.getNotifications(20),
        api.getPayments(),
        api.getEnrollments().catch(() => ({ results: [] })),
        api.getFinancialReconciliation().catch(() => null),
      ])

      setNotifications(notifs)
      setPayments(paymentsRes)
      setReconciliation(reconciliationRes)

      let app: Application | null = null
      if (profile.email) {
        const appsRes = await api.getApplications({ email: profile.email, ordering: '-applied_at', limit: 1 }).catch(() => ({ results: [] }))
        app = appsRes.results[0] ?? null
        if (app?.id) {
          const detail = await api.getApplicationById(app.id).catch(() => app)
          setApplication(detail)
          setInterviewSlot(detail?.interview_slot ?? null)
          app = detail
        } else {
          setApplication(null)
          setInterviewSlot(null)
        }
      }

      const backendPaid = Number(reconciliationRes?.amount_paid ?? profile.total_fee_paid ?? 0)
      const enrollments = Array.isArray(enrollmentsRes) ? enrollmentsRes : (enrollmentsRes.results ?? [])
      const firstEnrolled = enrollments[0] ?? profile.courses_enrolled?.[0] ?? null

      if (firstEnrolled) {
        const amount = Number(reconciliationRes?.total_fee ?? firstEnrolled.amount ?? profile.program_fee ?? 0)
        setEnrollment({
          enrollmentId: firstEnrolled.enrollment_id,
          programName: firstEnrolled.program_name ?? firstEnrolled.title ?? '',
          programId: firstEnrolled.program ?? firstEnrolled.program_id ?? null,
          amount,
          amountPaid: backendPaid,
          balance: Number(reconciliationRes?.amount_remaining ?? Math.max(0, amount - backendPaid)),
          status: firstEnrolled.status ?? 'pending',
          paymentStatus: firstEnrolled.payment_status ?? 'pending',
          paymentPlan: firstEnrolled.payment_plan,
          installmentAmount: firstEnrolled.installment_amount != null ? Number(firstEnrolled.installment_amount) : null,
        })
      } else if (app) {
        const amount = Number(reconciliationRes?.total_fee ?? app.estimated_fees ?? 0)
        setEnrollment({
          programName: app.program_name ?? '',
          programId: app.program ?? null,
          amount,
          amountPaid: backendPaid,
          balance: Number(reconciliationRes?.amount_remaining ?? Math.max(0, amount - backendPaid)),
          status: app.status,
          paymentStatus: backendPaid >= amount && amount > 0 ? 'paid' : 'pending',
        })
      } else {
        setEnrollment(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load your data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useInterval(() => load(true), 30_000)

  return {
    user,
    application,
    setApplication,
    interviewSlot,
    setInterviewSlot,
    enrollment,
    notifications,
    setNotifications,
    payments,
    reconciliation,
    loading,
    refreshing,
    error,
    load,
  }
}

function PageHeader({ title, subtitle, onRefresh, refreshing }: {
  title: string
  subtitle?: string
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-2 self-start">
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  )
}

function StudentPage({ section }: { section: StudentSection }) {
  const navigate = useNavigate()
  const data = useStudentData()
  const {
    user,
    application,
    setApplication,
    interviewSlot,
    setInterviewSlot,
    enrollment,
    notifications,
    setNotifications,
    payments,
    reconciliation,
    loading,
    refreshing,
    error,
    load,
  } = data

  const appStatus = application?.status ?? enrollment?.status ?? ''
  const paymentUnlocked = ['interview_completed', 'enrolled'].includes(application?.status ?? '')
  const unread = notifications.filter((n) => !n.read).length
  const depositedAmount = Number(enrollment?.amountPaid ?? 0)
  const displayName = user?.display_name ?? user?.email?.split('@')[0] ?? 'Student'
  const interviewDate = interviewSlot?.chosen_time
    ? new Date(interviewSlot.chosen_time).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const balance = enrollment?.balance ?? 0
  const isFullyPaid = balance <= 0 && (enrollment?.amount ?? 0) > 0
  const showQuickPay = paymentUnlocked && !isFullyPaid && balance > 0

  const markOneRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      toast.error('Failed to mark notifications read')
    }
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex flex-col items-center justify-center gap-4 text-center p-8">
          <AlertCircle className="w-10 h-10 text-destructive/60" />
          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={() => load()}>Try again</Button>
        </div>
      </StudentLayout>
    )
  }

  if (section === 'payments') {
    return (
      <StudentLayout unreadCount={unread}>
        <div className="space-y-6">
          <PageHeader title="Payments" subtitle="Track your fees, plan, and payment history." onRefresh={() => load(true)} refreshing={refreshing} />
          {paymentUnlocked ? (
            <PaymentTab
              enrollment={enrollment}
              payments={payments}
              onPaymentDone={load}
              applicationStatus={application?.status}
              depositedAmount={depositedAmount}
              reconciliation={reconciliation}
            />
          ) : (
            <div className="bg-card border rounded-2xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payments aren't available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">You'll be able to make payments after your admissions interview is completed. Check your Application page to see your current progress.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/student/application' } as never)} className="gap-2">
                <Clock className="w-4 h-4" />
                View Application Progress
              </Button>
            </div>
          )}
        </div>
      </StudentLayout>
    )
  }

  if (section === 'application') {
    return (
      <StudentLayout unreadCount={unread}>
        <div className="space-y-6">
          <PageHeader title="Application" subtitle="Track your admissions progress and interview details." onRefresh={() => load(true)} refreshing={refreshing} />
          {!application && !enrollment && (
            <div className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold">No application yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start your journey by applying to a program — it only takes a few minutes!</p>
              </div>
              <Button onClick={() => navigate({ to: '/apply' } as never)} className="gap-2 shrink-0">
                Apply Now <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {interviewDate && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">Interview scheduled</p>
                <p className="text-xs text-muted-foreground mt-0.5">{interviewDate} EAT</p>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Application Progress</h2>
            </div>
            <Separator />
            <ProcessTracker
              currentStatus={application?.status}
              applicationId={application?.id}
              interviewSlot={interviewSlot}
              onScheduled={(s) => {
                setInterviewSlot(s)
                setApplication((a) => a ? { ...a, status: 'interview_scheduled' } : a)
              }}
              onRequestPayment={() => navigate({ to: '/student/payments' } as never)}
              depositedAmount={depositedAmount}
              navigateToApply={() => navigate({ to: '/apply' } as never)}
            />
          </div>
        </div>
      </StudentLayout>
    )
  }

  if (section === 'notifications') {
    return (
      <StudentLayout unreadCount={unread}>
        <div className="space-y-6">
          <PageHeader title="Notifications" subtitle="Admissions and payment updates from Nexa Academy." onRefresh={() => load(true)} refreshing={refreshing} />
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Inbox</h2>
                {unread > 0 && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unread} unread</span>}
              </div>
              {unread > 0 && <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-14 space-y-2 px-6">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  We'll notify you here when your application status changes, your interview is confirmed, or a payment is received.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => <NotificationItem key={n.id} n={n} onMarkRead={markOneRead} />)}
              </div>
            )}
          </div>
        </div>
      </StudentLayout>
    )
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  return (
    <StudentLayout unreadCount={unread}>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle={`${greeting(displayName)} · ${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
          onRefresh={() => load(true)}
          refreshing={refreshing}
        />

        {/* Hero: Next Step */}
        <NextStepCard
          appStatus={appStatus}
          interviewSlot={interviewSlot}
          enrollment={enrollment}
          depositedAmount={depositedAmount}
          navigate={navigate}
        />

        {/* Stat cards — 3 columns (Program, Status, Balance) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={BookOpen}
            label="Your Program"
            value={enrollment?.programName?.split(' ').slice(0, 3).join(' ') ?? application?.program_name ?? '—'}
            tone="primary"
          />
          <StatCard
            icon={CheckCircle2}
            label="Current Status"
            value={appStatus ? statusText(appStatus) : '—'}
            sub={appStatus ? undefined : 'No application yet'}
            tone={appStatus ? 'success' : 'default'}
          />
          <StatCard
            icon={Wallet}
            label="Balance Due"
            value={
              enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0
                ? 'Fully Paid'
                : enrollment?.balance != null
                ? `KSh ${enrollment.balance.toLocaleString()}`
                : '—'
            }
            sub={enrollment?.amount ? `of KSh ${enrollment.amount.toLocaleString()}` : undefined}
            tone={
              enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0
                ? 'success'
                : enrollment?.balance != null
                ? 'warning'
                : 'default'
            }
          />
        </div>

        {/* Quick Pay — only visible when payment is available and not fully paid */}
        {showQuickPay && (
          <QuickPayCard
            balance={balance}
            installmentAmount={enrollment?.installmentAmount}
            applicationStatus={appStatus}
            depositedAmount={depositedAmount}
            userEmail={user?.email}
            programId={enrollment?.programId}
            onPaymentDone={() => load()}
            onViewFullDetails={() => navigate({ to: '/student/payments' } as never)}
          />
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate({ to: '/student/application' } as never)}
            className="flex items-center gap-3 px-4 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Clock className="w-4 h-4" />
            <span className="flex-1 text-left">View Application</span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={() => navigate({ to: '/student/payments' } as never)}
            className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
          >
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Payments</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate({ to: '/student/notifications' } as never)}
            className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Notifications{unread > 0 ? ` (${unread})` : ''}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Bottom grid: Application Snapshot + Recent Notifications */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Application Snapshot</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${statusConfig(appStatus)}`}>
                {appStatus ? statusText(appStatus) : 'Not started'}
              </span>
            </div>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Program</span>
                <span className="font-medium text-right">{enrollment?.programName ?? application?.program_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Payment plan</span>
                <span className="font-medium text-right">{enrollment?.paymentPlan ?? application?.payment_plan ?? 'Standard plan'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Interview</span>
                <span className="font-medium text-right">{interviewDate ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Notifications</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/student/notifications' } as never)}>View all</Button>
            </div>
            <Separator />
            {notifications.slice(0, 3).length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">No messages yet.</p>
                <p className="text-xs text-muted-foreground">We'll send updates here as your application progresses.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message ?? 'New update'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}

export function StudentDashboard() {
  return <StudentPage section="dashboard" />
}

export function StudentApplication() {
  return <StudentPage section="application" />
}

export function StudentPayments() {
  return <StudentPage section="payments" />
}

export function StudentNotifications() {
  return <StudentPage section="notifications" />
}
