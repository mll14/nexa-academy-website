import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ArrowUpDown, ChevronRight, Trash2 } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { UnderlineTabs } from '../../components/ui/tabs'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { statusText, statusBadgeClass, formatDate } from '../../lib/utils'
import type { Application } from '../../types'
import toast from 'react-hot-toast'
import { DeleteConfirmDialog } from '../../components/ui/delete-confirm-dialog'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Applications' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'rejected', label: 'Rejected' },
]

const SORT_OPTIONS = [
  { value: '-applied_at', label: 'Newest first' },
  { value: 'applied_at', label: 'Oldest first' },
  { value: 'full_name', label: 'Name A–Z' },
  { value: '-estimated_fees', label: 'Highest fees' },
]

const PAGE_SIZE = 15

const INTAKE_TABS = [
  { value: 'with', label: 'With intake dates' },
  { value: 'without', label: 'No intake dates' },
] as const


const STATUS_DOT: Record<string, string> = {
  pending: 'bg-warning',
  reviewed: 'bg-secondary',
  approved: 'bg-success',
  interview_scheduled: 'bg-primary',
  interview_completed: 'bg-primary/60',
  enrolled: 'bg-success',
  rejected: 'bg-destructive',
}

export function Applications() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canDelete = hasPermission('applications.manage')
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [status, setStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [ordering, setOrdering] = useState('-applied_at')
  const [page, setPage] = useState(1)
  const [intakeTab, setIntakeTab] = useState<(typeof INTAKE_TABS)[number]['value']>('with')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'applications', { status, searchTerm, ordering, page, intakeTab }],
    queryFn: () =>
      api.getApplications({
        status: status === 'all' ? undefined : status,
        search: searchTerm || undefined,
        ordering,
        page,
        page_size: PAGE_SIZE,
        intake_status: intakeTab,
      }),
    placeholderData: (prev) => prev,
  })

  const applications: Application[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openDetail = (app: Application) =>
    navigate({ to: '/admin/applications/$id', params: { id: app.id } })

  const handleDelete = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation()
    setDeleteTarget(app)
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.deleteApplication(deleteTarget.id)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application deleted.')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Applications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${total} application${total !== 1 ? 's' : ''} ${intakeTab === 'with' ? 'with intake dates' : 'without intake dates'}`}
            </p>
          </div>
        </div>

        <UnderlineTabs
          tabs={[...INTAKE_TABS]}
          active={intakeTab}
          onChange={(value) => {
            setIntakeTab(value as typeof intakeTab)
            setPage(1)
          }}
          className="overflow-x-auto"
        />

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 rounded-xl"
              placeholder="Search name, email or program…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="flex gap-2.5">
            <div className="w-52">
              <Select
                value={status}
                onChange={(v) => { setStatus(v); setPage(1) }}
                options={STATUS_OPTIONS}
                icon={
                  <span
                    className={`w-2 h-2 rounded-full ${STATUS_DOT[status] ?? 'bg-muted-foreground'}`}
                  />
                }
              />
            </div>
            <div className="w-44">
              <Select
                value={ordering}
                onChange={setOrdering}
                options={SORT_OPTIONS}
                icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
            Failed to load applications.
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-muted rounded-2xl animate-pulse"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">No applications match your filters.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {applications.map((app) => (
              <div
                key={app.id}
                onClick={() => openDetail(app)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(app.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{app.full_name}</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(app.status)}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[app.status] ?? 'bg-current'}`} />
                      {statusText(app.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {app.email}
                    <span className="mx-1.5 opacity-40">·</span>
                    {app.program_name}
                    {app.start_date && (
                      <>
                        <span className="mx-1.5 opacity-40">·</span>
                        Intake {formatDate(app.start_date)}
                      </>
                    )}
                  </p>
                </div>

                {/* Fee + date */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
                  {app.estimated_fees != null && (
                    <p className="text-xs font-semibold">
                      KSh {Number(app.estimated_fees).toLocaleString('en-KE')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</p>
                </div>

                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, app)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete application"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Application"
        itemName={deleteTarget?.full_name ?? ''}
        consequences="This application and all its associated logs, interview slots, and status history will be permanently deleted. This cannot be undone."
        isPending={deleteLoading}
      />
      </div>
    </AdminLayout>
  )
}
