import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpen, CheckCircle2, Clock, CreditCard,
  Bell, ChevronRight, RefreshCw, TrendingUp,
  CalendarDays, AlertCircle, Wallet,
} from 'lucide-react'
import { StudentLayout } from '../../components/StudentLayout'
import { Separator } from '../../components/ui/separator'
import { Button } from '../../components/ui/button'
import { ProcessTracker, getProcessProgress } from '../../components/ProcessTracker'
import { PaymentTab } from './PaymentTab'
import { useAuth } from '../../context/AuthContext'
import { useInterval } from '../../hooks/useInterval'
import * as api from '../../lib/api'
import { statusText } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Application, Notification, Payment, InterviewSlot } from '../../types'

interface DashEnrollment {
  programName: string
  programId: string | null
  amount: number
  amountPaid: number
  balance: number
  status: string
  paymentStatus: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      return { cls: 'bg-success/10 text-success border-success/20', dot: 'bg-success' }
    case 'pending':
    case 'reviewed':
      return { cls: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' }
    case 'rejected':
      return { cls: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' }
    default:
      return { cls: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' }
  }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 space-y-3 ${accent ?? 'border-border'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold text-sm mt-0.5 leading-snug">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange, unreadCount }: {
  tabs: string[]; active: string; onChange: (t: string) => void; unreadCount: number
}) {
  const labels: Record<string, string> = {
    tracker: 'Application', transactions: 'Payments', notifications: 'Notifications',
  }
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border w-fit min-w-full sm:min-w-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`relative flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              active === t
                ? 'bg-background shadow-sm text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels[t] ?? t}
            {t === 'notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Notification item ─────────────────────────────────────────────────────────

function NotifItem({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  return (
    <div
      className={`flex gap-3 p-3.5 rounded-xl border transition-colors ${
        n.read ? 'bg-background border-border' : 'bg-primary/5 border-primary/20'
      }`}
    >
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        n.read ? 'bg-muted' : 'bg-primary/15'
      }`}>
        <Bell className={`w-3.5 h-3.5 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${n.read ? '' : 'text-foreground'}`}>{n.title}</p>
        {n.message && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>}
        <p className="text-xs text-muted-foreground mt-1.5">
          {new Date((n.timestamp ?? n.created_at) as string).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
      {!n.read && (
        <button
          onClick={() => onMarkRead(n.id)}
          className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
        >
          Mark read
        </button>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('tracker')
  const [application, setApplication] = useState<Application | null>(null)
  const [interviewSlot, setInterviewSlot] = useState<InterviewSlot | null>(null)
  const [enrollment, setEnrollment] = useState<DashEnrollment | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [profile, notifs, paymentsRes] = await Promise.all([
        api.getProfile(),
        api.getNotifications(20),
        api.getPayments(),
      ])

      setNotifications(notifs)
      setPayments(paymentsRes)

      let app: Application | null = null
      if (profile.email) {
        try {
          const appsRes = await api.getApplications({ email: profile.email, ordering: '-applied_at', limit: 1 })
          app = appsRes.results[0] ?? null
          if (app?.id) {
            try {
              const detail = await api.getApplicationById(app.id)
              setApplication(detail)
              setInterviewSlot(detail.interview_slot ?? null)
              app = detail
            } catch {
              setApplication(app)
              setInterviewSlot(app.interview_slot ?? null)
            }
          } else {
            setApplication(app)
            setInterviewSlot(null)
          }
        } catch { /* ignore */ }
      }

      if (app?.status === 'enrolled') {
        setActiveTab('tracker')
      }

      const backendPaid = Number(profile.total_fee_paid ?? 0)
      const firstEnrolled = profile.courses_enrolled?.[0] ?? null

      if (firstEnrolled) {
        const amount = Number(firstEnrolled.amount ?? profile.program_fee ?? 0)
        setEnrollment({
          programName: firstEnrolled.program_name ?? firstEnrolled.title ?? '',
          programId: firstEnrolled.program ?? firstEnrolled.program_id ?? null,
          amount,
          amountPaid: backendPaid,
          balance: Math.max(0, amount - backendPaid),
          status: firstEnrolled.status ?? 'pending',
          paymentStatus: firstEnrolled.payment_status ?? 'pending',
        })
      } else if (app) {
        const amount = Number(app.estimated_fees ?? 0)
        setEnrollment({
          programName: app.program_name ?? '',
          programId: app.program ?? null,
          amount,
          amountPaid: backendPaid,
          balance: Math.max(0, amount - backendPaid),
          status: app.status,
          paymentStatus: backendPaid >= amount && amount > 0 ? 'paid' : 'pending',
        })
      } else {
        setEnrollment(null)
      }
    } catch (err) {
      console.error('Dashboard load error', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useInterval(() => loadDashboard(true), 30_000)

  useEffect(() => {
    if (activeTab === 'transactions' && !['interview_completed', 'enrolled'].includes(application?.status ?? '')) {
      setActiveTab('tracker')
    }
  }, [application?.status, activeTab])

  const markOneRead = async (id: string) => {
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

  const paymentUnlocked = ['interview_completed', 'enrolled'].includes(application?.status ?? '')
  const tabs = paymentUnlocked ? ['tracker', 'transactions', 'notifications'] : ['tracker', 'notifications']
  const unread = notifications.filter((n) => !n.read).length
  const depositedAmount = Number(enrollment?.amountPaid ?? 0)
  const appStatus = application?.status ?? enrollment?.status ?? ''
  const { cls: statusCls, dot: statusDot } = statusConfig(appStatus)
  const progress = appStatus ? getProcessProgress(appStatus) : 0

  const displayName = user?.display_name ?? user?.email?.split('@')[0] ?? 'Student'

  // ── Interview date helper ────────────────────────────────────────────────────
  const interviewDate = interviewSlot?.chosen_time
    ? new Date(interviewSlot.chosen_time).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  if (loading) {
    return (
      <StudentLayout>
        <div className="min-h-64 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <span className="text-base sm:text-lg font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg sm:text-xl font-bold leading-tight truncate">{greeting(displayName)}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── Status banner (when no application yet) ── */}
        {!application && !enrollment && (
          <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
            <AlertCircle className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">No application yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start your journey by applying to a program.</p>
            </div>
            <button
              onClick={() => navigate({ to: '/apply' } as never)}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Apply now <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={BookOpen}
            label="Program"
            value={enrollment?.programName?.split(' ').slice(0, 3).join(' ') ?? application?.program_name ?? '—'}
            accent={enrollment || application ? 'border-primary/20' : undefined}
          />
          <StatCard
            icon={CheckCircle2}
            label="Status"
            value={appStatus ? statusText(appStatus) : '—'}
            sub={appStatus ? undefined : 'No application'}
          />
          <StatCard
            icon={TrendingUp}
            label="Progress"
            value={progress > 0 ? `${progress}%` : '—'}
            sub={progress > 0 ? 'Through admissions' : undefined}
          />
          <StatCard
            icon={Wallet}
            label="Balance"
            value={enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0
              ? 'Fully Paid'
              : enrollment?.balance != null
                ? `KSh ${enrollment.balance.toLocaleString()}`
                : '—'}
            sub={enrollment?.amount ? `of KSh ${enrollment.amount.toLocaleString()}` : undefined}
            accent={enrollment?.balance != null && enrollment.balance <= 0 && enrollment.amount > 0 ? 'border-success/30' : undefined}
          />
        </div>

        {/* ── Current status pill ── */}
        {appStatus && (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium ${statusCls}`}>
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {statusText(appStatus)}
          </div>
        )}

        {/* ── Interview date callout ── */}
        {interviewDate && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <CalendarDays className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Interview scheduled</p>
              <p className="text-xs text-muted-foreground mt-0.5">{interviewDate}</p>
            </div>
            {interviewSlot?.meet_url && (
              <a
                href={interviewSlot.meet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Join Meet <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* ── Tab bar ── */}
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} unreadCount={unread} />

        {/* ── Tracker tab ── */}
        {activeTab === 'tracker' && (
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
              onRequestPayment={() => setActiveTab('transactions')}
              depositedAmount={depositedAmount}
              navigateToApply={() => navigate({ to: '/apply' } as never)}
            />
          </div>
        )}

        {/* ── Payments tab ── */}
        {activeTab === 'transactions' && paymentUnlocked && (
          <PaymentTab
            enrollment={enrollment}
            payments={payments}
            onPaymentDone={loadDashboard}
            applicationStatus={application?.status}
            depositedAmount={depositedAmount}
          />
        )}

        {/* ── Notifications tab ── */}
        {activeTab === 'notifications' && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Notifications</h2>
                {unread > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {unread} unread
                  </span>
                )}
              </div>
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                  Mark all read
                </Button>
              )}
            </div>
            <Separator />
            {notifications.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <NotifItem key={n.id} n={n} onMarkRead={markOneRead} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Quick actions footer ── */}
        {(application || enrollment) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {paymentUnlocked && (
              <button
                onClick={() => setActiveTab('transactions')}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium">Make a payment</span>
              </button>
            )}
            {unread > 0 && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{unread} unread notification{unread > 1 ? 's' : ''}</span>
              </button>
            )}
            <button
              onClick={() => loadDashboard(true)}
              className="flex items-center gap-2.5 p-3.5 rounded-xl border border-border hover:bg-muted transition-colors text-left"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium text-muted-foreground">Refresh status</span>
            </button>
          </div>
        )}

      </div>
    </StudentLayout>
  )
}
