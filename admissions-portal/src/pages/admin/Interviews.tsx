import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, RefreshCw, Search, ChevronRight, Check, X, Clock } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { AdminCalendar } from '../../components/admin/AdminCalendar'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog } from '../../components/ui/dialog'
import { SlotPicker } from '../../components/SlotPicker'
import * as api from '../../lib/api'
import { formatDate, formatDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Application } from '../../types'

function InterviewCard({
  app,
  onComplete,
  onCancel,
  onReschedule,
  onClick,
}: {
  app: Application
  onComplete: () => void
  onCancel: () => void
  onReschedule: () => void
  onClick: () => void
}) {
  const slot = app.interview_slot
  const isToday =
    slot?.chosen_time &&
    new Date(slot.chosen_time).toDateString() === new Date().toDateString()
  const isSoon =
    slot?.chosen_time &&
    new Date(slot.chosen_time).getTime() - Date.now() < 3_600_000 * 2 &&
    new Date(slot.chosen_time).getTime() > Date.now()

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-3 px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border last:border-0"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-primary">
          {(app.full_name || '?').charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{app.full_name}</p>
          {isToday && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              Today
            </span>
          )}
          {isSoon && !isToday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">
              <Clock className="w-2.5 h-2.5" /> Soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{app.program_name}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <p className="text-xs font-medium">{formatDateTime(slot?.chosen_time ?? '')} EAT</p>
          {(slot?.meet_url || slot?.zoom_link) && (
            <a
              href={slot.meet_url ?? slot.zoom_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <Video className="w-3 h-3" />
              Join
            </a>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-1.5 mt-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onComplete}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/10 hover:bg-success/20 text-success text-xs font-medium transition-colors"
          >
            <Check className="w-3 h-3" /> Complete
          </button>
          <button
            onClick={onReschedule}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
          >
            <Clock className="w-3 h-3" /> Reschedule
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity mt-1 shrink-0" />
    </div>
  )
}

export function Interviews() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [reschedulingApp, setReschedulingApp] = useState<Application | null>(null)
  const [rescheduleSlots, setRescheduleSlots] = useState<import('../../types').AvailableSlot[]>([])
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'interviews'],
    queryFn: () =>
      api.getApplications({ status: 'interview_scheduled', limit: 100 }).then((r) => {
        const apps = r.results ?? []
        return [...apps].sort((a: Application, b: Application) => {
          const ta = a.interview_slot?.chosen_time
            ? new Date(a.interview_slot.chosen_time).getTime()
            : Infinity
          const tb = b.interview_slot?.chosen_time
            ? new Date(b.interview_slot.chosen_time).getTime()
            : Infinity
          return ta - tb
        })
      }),
    refetchInterval: 60_000,
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'interviews'] })
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] })
      toast.success('Interview marked as complete')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'interviews'] })
      toast.success('Interview cancelled')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, time }: { id: string; time: string }) =>
      api.rescheduleInterview(id, time),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'interviews'] })
      setReschedulingApp(null)
      setRescheduleSlots([])
      toast.success('Interview rescheduled')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCancel = (id: string) => {
    if (!window.confirm('Cancel this interview? This will remove the calendar event.')) return
    cancelMutation.mutate(id)
  }

  const openReschedule = async (app: Application) => {
    setReschedulingApp(app)
    setRescheduleSlots([])
    setRescheduleLoading(true)
    try {
      const res = await api.getAvailableSlots(app.id)
      setRescheduleSlots(res.slots)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load available slots')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const todayStr = new Date().toDateString()
  const displayed = useMemo(() => {
    const q = search.toLowerCase().trim()
    return (data as Application[]).filter(
      (a) =>
        !q ||
        a.full_name?.toLowerCase().includes(q) ||
        a.program_name?.toLowerCase().includes(q),
    )
  }, [data, search])

  const todayInterviews = displayed.filter(
    (a) =>
      a.interview_slot?.chosen_time &&
      new Date(a.interview_slot.chosen_time).toDateString() === todayStr,
  )
  const upcomingInterviews = displayed.filter(
    (a) =>
      !a.interview_slot?.chosen_time ||
      new Date(a.interview_slot.chosen_time).toDateString() !== todayStr,
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Interviews</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(data as Application[]).length} scheduled · admissions@nexaacademy.co.ke
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main grid: calendar (wide) + list panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

          {/* Calendar — default month view */}
          <AdminCalendar />

          {/* Interview list */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 rounded-xl"
                placeholder="Search name or program…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Today's interviews */}
            {todayInterviews.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 px-1">
                  Today · {formatDate(new Date().toISOString())}
                </p>
                <Card className="rounded-2xl overflow-hidden border border-primary/20 bg-primary/[0.02]">
                  {todayInterviews.map((app) => (
                    <InterviewCard
                      key={app.id}
                      app={app}
                      onClick={() => navigate({ to: '/admin/applications/$id', params: { id: app.id } })}
                      onComplete={() => completeMutation.mutate(app.id)}
                      onCancel={() => handleCancel(app.id)}
                      onReschedule={() => openReschedule(app)}
                    />
                  ))}
                </Card>
              </div>
            )}

            {/* Upcoming */}
            <div>
              {todayInterviews.length > 0 && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  Upcoming
                </p>
              )}
              <Card className="rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-semibold">Scheduled Interviews</p>
                  <span className="text-xs text-muted-foreground">
                    {displayed.length} total
                  </span>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : upcomingInterviews.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {(data as Application[]).length === 0
                      ? 'No interviews scheduled yet.'
                      : 'No results match your search.'}
                  </div>
                ) : (
                  upcomingInterviews.map((app) => (
                    <InterviewCard
                      key={app.id}
                      app={app}
                      onClick={() => navigate({ to: '/admin/applications/$id', params: { id: app.id } })}
                      onComplete={() => completeMutation.mutate(app.id)}
                      onCancel={() => handleCancel(app.id)}
                      onReschedule={() => openReschedule(app)}
                    />
                  ))
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule dialog */}
      <Dialog
        open={!!reschedulingApp}
        onClose={() => { setReschedulingApp(null); setRescheduleSlots([]) }}
        title={`Reschedule — ${reschedulingApp?.full_name ?? ''}`}
        description="Select a new date and time. All times are in East Africa Time (EAT)."
        className="max-w-2xl"
      >
        {rescheduleLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading available slots…
          </div>
        ) : (
          <SlotPicker
            slots={rescheduleSlots}
            onConfirm={(time) =>
              rescheduleMutation.mutate({ id: reschedulingApp!.id, time })
            }
            submitting={rescheduleMutation.isPending}
            confirmLabel="Reschedule Interview"
          />
        )}
      </Dialog>
    </AdminLayout>
  )
}

export default Interviews
