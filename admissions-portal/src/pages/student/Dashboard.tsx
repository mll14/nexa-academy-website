import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { StudentLayout } from '../../components/StudentLayout'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { ProcessTracker, getProcessProgress } from '../../components/ProcessTracker'
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
  const progress = appStatus ? getProcessProgress(appStatus) : 0
  const paymentUnlocked = ['interview_completed', 'enrolled'].includes(application?.status ?? '')
  const unread = notifications.filter((n) => !n.read).length
  const depositedAmount = Number(enrollment?.amountPaid ?? 0)
  const displayName = user?.display_name ?? user?.email?.split('@')[0] ?? 'Student'
  const interviewDate = interviewSlot?.chosen_time
    ? new Date(interviewSlot.chosen_time).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : null

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
            <div className="bg-card border rounded-2xl p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payments are not available yet</p>
                <p className="text-sm text-muted-foreground mt-1">Complete your interview process before making a payment.</p>
              </div>
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
          <PageHeader title="Application" subtitle="View your admissions progress and interview details." onRefresh={() => load(true)} refreshing={refreshing} />
          {!application && !enrollment && (
            <div className="bg-card border rounded-2xl p-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">No application yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start your journey by applying to a program.</p>
              </div>
              <Button onClick={() => navigate({ to: '/apply' } as never)}>Apply now</Button>
            </div>
          )}
          {interviewDate && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">Interview scheduled</p>
                <p className="text-xs text-muted-foreground mt-0.5">{interviewDate}</p>
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
              <div className="text-center py-14 space-y-2">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
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

  return (
    <StudentLayout unreadCount={unread}>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          subtitle={`${greeting(displayName)} · ${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
          onRefresh={() => load(true)}
          refreshing={refreshing}
        />

        {!application && !enrollment && (
          <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
            <AlertCircle className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">No application yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start your journey by applying to a program.</p>
            </div>
            <Button size="sm" onClick={() => navigate({ to: '/apply' } as never)}>Apply now</Button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Program" value={enrollment?.programName?.split(' ').slice(0, 3).join(' ') ?? application?.program_name ?? '—'} tone="primary" />
          <StatCard icon={CheckCircle2} label="Status" value={appStatus ? statusText(appStatus) : '—'} sub={appStatus ? undefined : 'No application'} tone={appStatus ? 'success' : 'default'} />
          <StatCard icon={TrendingUp} label="Progress" value={progress > 0 ? `${progress}%` : '—'} sub={progress > 0 ? 'Through admissions' : undefined} tone="primary" />
          <StatCard
            icon={Wallet}
            label="Balance"
            value={enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0 ? 'Fully Paid' : enrollment?.balance != null ? `KSh ${enrollment.balance.toLocaleString()}` : '—'}
            sub={enrollment?.amount ? `of KSh ${enrollment.amount.toLocaleString()}` : undefined}
            tone={enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0 ? 'success' : 'warning'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => navigate({ to: '/student/application' } as never)} className="flex items-center gap-3 px-4 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
            <Clock className="w-4 h-4" />
            <span className="flex-1 text-left">View Application</span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
          <button onClick={() => navigate({ to: '/student/payments' } as never)} className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Payments</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate({ to: '/student/notifications' } as never)} className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Notifications{unread > 0 ? ` (${unread})` : ''}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Application Snapshot</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${statusConfig(appStatus)}`}>{appStatus ? statusText(appStatus) : 'Not started'}</span>
            </div>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Program</span><span className="font-medium text-right">{enrollment?.programName ?? application?.program_name ?? '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment plan</span><span className="font-medium text-right">{enrollment?.paymentPlan ?? application?.payment_plan ?? 'Standard plan'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Interview</span><span className="font-medium text-right">{interviewDate ?? '—'}</span></div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Notifications</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/student/notifications' } as never)}>View all</Button>
            </div>
            <Separator />
            {notifications.slice(0, 3).length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
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
