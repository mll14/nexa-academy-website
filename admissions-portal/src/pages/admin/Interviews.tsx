import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, RefreshCw, Search, Check, X, Clock, CalendarClock } from 'lucide-react'
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
  const chosenTime = slot?.chosen_time ? new Date(slot.chosen_time) : null
  const isToday = chosenTime?.toDateString() === new Date().toDateString()
  const isPast = chosenTime ? chosenTime.getTime() < Date.now() : false
  const isSoon = chosenTime && !isPast
    && chosenTime.getTime() - Date.now() < 2 * 3_600_000

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer px-4 py-3.5 hover:bg-muted/30 transition-colors border-b border-border/70 last:border-0"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">
            {(app.full_name || '?').charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold leading-tight truncate">{app.full_name}</p>
            {isToday && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary shrink-0">
                TODAY
              </span>
            )}
            {isSoon && !isToday && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 shrink-0">
                <Clock className="w-2 h-2" /> SOON
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground shrink-0">
                PAST
              </span>
            )}
          </div>

          {/* Program */}
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{app.program_name}</p>

          {/* Time + join */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
              <CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />
              {formatDateTime(slot?.chosen_time ?? '')}
            </div>
            {(slot?.meet_url || slot?.zoom_link) && (
              <a
                href={slot.meet_url ?? slot.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
              >
                <Video className="w-2.5 h-2.5" />
                Join
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Actions — full width row, no overflow */}
      <div
        className="mt-3 grid grid-cols-3 gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onComplete}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold transition-colors"
        >
          <Check className="w-3 h-3 shrink-0" />
          Done
        </button>
        <button
          onClick={onReschedule}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-muted hover:bg-muted/60 text-foreground text-[11px] font-semibold transition-colors"
        >
          <Clock className="w-3 h-3 shrink-0" />
          Reschedule
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-destructive/8 hover:bg-destructive/15 text-destructive text-[11px] font-semibold transition-colors"
        >
          <X className="w-3 h-3 shrink-0" />
          Cancel
        </button>
      </div>
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
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [customTime, setCustomTime] = useState('')

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
    setUseCustomTime(false)
    setCustomTime('')
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

  const handleCustomReschedule = () => {
    if (!reschedulingApp || !customTime) return
    // datetime-local gives "YYYY-MM-DDTHH:mm" — treat as EAT by appending +03:00
    const isoTime = customTime.includes('+') || customTime.endsWith('Z')
      ? customTime
      : `${customTime}:00+03:00`
    rescheduleMutation.mutate({ id: reschedulingApp.id, time: isoTime })
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
        <div>
          <h1 className="font-heading text-2xl font-bold">Interviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(data as Application[]).length} scheduled · admissions@nexaacademy.co.ke
          </p>
        </div>

        {/* Main grid: calendar (wide) + list panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* Calendar */}
          <AdminCalendar />

          {/* Interview list */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 rounded-xl text-sm"
                placeholder="Search name or program…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Today's interviews */}
            {todayInterviews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    Today · {formatDate(new Date().toISOString())}
                  </p>
                </div>
                <Card className="rounded-2xl overflow-hidden border border-primary/25 shadow-sm">
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

            {/* All scheduled */}
            <Card className="rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Scheduled</p>
                  {(data as Application[]).length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {displayed.length}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {(data as Application[]).length === 0
                      ? 'No interviews scheduled yet.'
                      : 'No results match your search.'}
                  </p>
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
        ) : useCustomTime ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Custom date & time (EAT)
              </label>
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">Allows scheduling outside normal working hours (6 am, 8 pm, etc.)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUseCustomTime(false)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                ← Back to slots
              </button>
              <button
                onClick={handleCustomReschedule}
                disabled={!customTime || rescheduleMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? 'Rescheduling…' : 'Confirm Custom Time'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SlotPicker
              slots={rescheduleSlots}
              onConfirm={(time) =>
                rescheduleMutation.mutate({ id: reschedulingApp!.id, time })
              }
              submitting={rescheduleMutation.isPending}
              confirmLabel="Reschedule Interview"
            />
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setUseCustomTime(true)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Need a different time? → Use custom date & time
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </AdminLayout>
  )
}

export default Interviews
