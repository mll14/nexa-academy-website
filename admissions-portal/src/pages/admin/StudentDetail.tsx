import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, CreditCard, BookOpen, WalletCards } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { statusText, statusBadgeClass, formatDate } from '../../lib/utils'
import type { Payment } from '../../types'

export function StudentDetail() {
  const { uid } = useParams({ from: '/admin/students/$uid' })
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'student', uid],
    queryFn: () => api.getStudentDetail(uid),
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-48">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <p className="text-destructive">Student not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/admin/applications' })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const user = data.user
  const application = data.applications?.[0]
  const payments = data.payments ?? []
  const enrollment = data.enrollments?.[0]
  const reconciliation = data.reconciliation

  const totalPaid = (payments ?? [])
    .filter((p: Payment) => ['completed', 'paid', 'success'].includes(p.status))
    .reduce((s: number, p: Payment) => s + parseFloat(p.amount), 0)

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/applications' })}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-heading text-xl font-bold flex-1">{user.display_name ?? user.email}</h1>
          {application && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(application.status)}`}>
              {statusText(application.status)}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* User info */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Account</h2>
              </div>
              <Separator />
              {[
                { label: 'Email', value: user.email },
                { label: 'Phone', value: user.phone },
                { label: 'Role', value: user.role },
                { label: 'Joined', value: formatDate((user as unknown as Record<string, string>).created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value ?? '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enrollment */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Enrollment</h2>
              </div>
              <Separator />
              {enrollment ? (
                <>
                  {[
                    { label: 'Program', value: enrollment.program_name },
                    { label: 'Enrolled', value: formatDate(enrollment.enrollment_date) },
                    { label: 'Status', value: enrollment.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value ?? '—'}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet enrolled.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Application summary */}
        {application && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Application</h2>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: '/admin/applications/$id', params: { id: application.id } })}>
                  View detail
                </Button>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Program', value: application.program_name },
                  { label: 'Start Date', value: formatDate(application.start_date) },
                  { label: 'Payment Plan', value: application.payment_plan },
                  { label: 'Fee', value: application.estimated_fees ? `KSh ${Number(application.estimated_fees).toLocaleString()}` : null },
                  { label: 'Applied', value: formatDate(application.applied_at) },
                  { label: 'Status', value: statusText(application.status) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial reconciliation */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <WalletCards className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Financial Reconciliation</h2>
              </div>
              {reconciliation && (
                <Badge className={reconciliation.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                  {reconciliation.status === 'paid' ? 'Settled' : 'Outstanding'}
                </Badge>
              )}
            </div>
            <Separator />
            {reconciliation ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Fee', value: reconciliation.total_fee },
                    { label: 'Paid', value: reconciliation.amount_paid },
                    { label: 'Remaining', value: reconciliation.amount_remaining },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-bold text-sm mt-1">KSh {Number(value).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {reconciliation.items.map((item) => (
                    <div key={item.enrollment_id ?? item.program_id ?? item.program_name} className="py-3 last:pb-0">
                      <div className="flex justify-between gap-3 text-sm">
                        <div>
                          <p className="font-semibold">{item.program_name || 'Program fees'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.payment_plan || 'Standard plan'}
                            {item.installment_amount ? ` · Installment KSh ${Number(item.installment_amount).toLocaleString()}` : ''}
                          </p>
                        </div>
                        <p className="font-semibold text-right">KSh {Number(item.amount_remaining).toLocaleString()} left</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reconciliation data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        {(payments ?? []).length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Payments</h2>
                </div>
                <p className="text-sm font-semibold text-primary">KSh {totalPaid.toLocaleString()} paid</p>
              </div>
              <Separator />
              <div className="divide-y divide-border -mx-5">
                {payments.map((p: Payment) => {
                  const pid = p.payment_id || p.id
                  const statusClass = ['completed', 'paid', 'success'].includes(p.status)
                    ? 'bg-success/10 text-success'
                    : p.status === 'pending'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/10 text-destructive'
                  return (
                    <div key={pid} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <div className="flex-1">
                        <p className="font-semibold">KSh {parseFloat(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.payment_date ?? p.created_at)}
                          {p.payment_reference ? ` · ${p.payment_reference}` : ''}
                        </p>
                      </div>
                      <Badge className={statusClass}>{p.status}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
