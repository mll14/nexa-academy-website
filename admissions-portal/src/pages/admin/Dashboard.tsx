import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, CreditCard, BookOpen, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { statusText, statusBadgeClass, formatDate } from '../../lib/utils'
import type { Application, ApplicationStats } from '../../types'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: api.getApplicationStats,
    refetchInterval: 30_000,
  })

  const { data: recentApps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['admin', 'recent-apps'],
    queryFn: () =>
      api.getApplications({ limit: 8, ordering: '-applied_at' }).then((r) => r.results),
  })

  const { data: paymentStats, isLoading: paymentStatsLoading } = useQuery({
    queryKey: ['admin', 'payment-stats'],
    queryFn: api.getPaymentStats,
  })

  const { data: messagesRes } = useQuery({
    queryKey: ['admin', 'messages-count'],
    queryFn: () => api.getMessages({ limit: 1, is_read: 'false' }),
  })

  const revenue = Number(paymentStats?.total_revenue ?? 0)

  const loading = statsLoading || appsLoading || paymentStatsLoading

  const statCards = [
    { label: 'Total Applications', value: (stats as ApplicationStats)?.total ?? (stats as ApplicationStats)?.count ?? 0, icon: Users, accent: 'text-primary', iconBg: 'bg-primary/10', href: '/admin/applications', permission: 'applications.view' },
    { label: 'Unread Messages', value: messagesRes?.count ?? 0, icon: MessageSquare, accent: 'text-warning', iconBg: 'bg-warning/10', href: '/admin/messages', permission: 'messages.view' },
    { label: 'Revenue (KSh)', value: revenue.toLocaleString('en-KE'), icon: CreditCard, accent: 'text-success', iconBg: 'bg-success/10', href: '/admin/payments', permission: 'transactions.view' },
    { label: 'Enrolled Students', value: (stats as ApplicationStats)?.enrolled ?? (stats as ApplicationStats)?.enrolled_count ?? 0, icon: BookOpen, accent: 'text-primary', iconBg: 'bg-primary/10', href: '/admin/enrolled', permission: 'students.view' },
  ].filter(({ permission }) => hasPermission(permission))

  const pendingCount = recentApps.filter((a: Application) => a.status === 'pending').length

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {pendingCount > 0 && hasPermission('applications.view') && (
            <button
              onClick={() => navigate({ to: '/admin/applications' })}
              className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-xl text-sm text-warning font-medium hover:bg-warning/20 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              {pendingCount} pending review
            </button>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, accent, iconBg, href }) => (
            <button
              key={label}
              onClick={() => navigate({ to: href as never })}
              className="text-left bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-5 h-5 ${accent}`} />
              </div>
              <div className="space-y-0.5">
                <p className="font-heading text-2xl font-bold tracking-tight leading-none">
                  {loading ? <span className="inline-block w-16 h-7 bg-muted rounded animate-pulse" /> : value}
                </p>
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick actions — only show if user has access */}
        {(hasPermission('applications.view') || hasPermission('interviews.view') || hasPermission('programs.view')) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hasPermission('applications.view') && (
              <button onClick={() => navigate({ to: '/admin/applications' })} className="flex items-center gap-3 px-4 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                <Users className="w-4 h-4" />
                <span className="flex-1 text-left">Review Applications</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </button>
            )}
            {hasPermission('interviews.view') && (
              <button onClick={() => navigate({ to: '/admin/interviews' })} className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left">Manage Interviews</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {hasPermission('programs.view') && (
              <button onClick={() => navigate({ to: '/admin/programs' })} className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm hover:bg-muted transition-colors">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left">Manage Programs</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Recent applications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Applications</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/applications' })} className="text-primary gap-1.5">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No applications yet.</div>
          ) : (
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
              {recentApps.map((app: Application) => (
                <div
                  key={app.id}
                  onClick={() => app.id && navigate({ to: '/admin/applications/$id', params: { id: app.id } })}
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{(app.full_name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.program_name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(app.status)}`}>
                      {statusText(app.status)}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(app.applied_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
