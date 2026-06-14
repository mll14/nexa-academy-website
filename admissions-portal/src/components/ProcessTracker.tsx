import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Calendar, CreditCard, Video } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Dialog } from './ui/dialog'
import { SlotPicker, formatFullDateTime } from './SlotPicker'
import { DepositProgress } from './DepositProgress'
import * as api from '../lib/api'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import type { InterviewSlot } from '../types'

export const STAGES = [
  { key: 'pending', label: 'Application Submitted', icon: CheckCircle2 },
  { key: 'reviewed', label: 'Under Review', icon: Clock },
  { key: 'approved', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'interview_scheduled', label: 'Interview Scheduled', icon: Calendar },
  { key: 'interview_completed', label: 'Interview Passed', icon: CheckCircle2 },
  { key: 'enrolled', label: 'Enrolled', icon: CreditCard },
]

export function getProcessProgress(status: string): number {
  if (!status) return 0
  const idx = STAGES.findIndex((s) => s.key === status)
  if (idx < 0) return 0
  return Math.round(((idx + 1) / STAGES.length) * 100)
}

interface Props {
  currentStatus?: string
  applicationId?: string
  interviewSlot?: InterviewSlot | null
  onScheduled?: (slot: InterviewSlot) => void
  onRequestPayment?: () => void
  depositedAmount?: number
  navigateToApply?: () => void
}

export function ProcessTracker({
  currentStatus,
  applicationId,
  interviewSlot: initialSlot,
  onScheduled,
  onRequestPayment,
  depositedAmount = 0,
  navigateToApply,
}: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStatus)
  const [slot, setSlot] = useState<InterviewSlot | null>(initialSlot ?? null)
  const [allSlots, setAllSlots] = useState<api.AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)

  useEffect(() => {
    setSlot(initialSlot ?? null)
  }, [initialSlot])

  const fetchSlots = async () => {
    if (!applicationId) return
    setSlotsLoading(true)
    setSlotsError(false)
    try {
      const res = await api.getAvailableSlots(applicationId)
      setAllSlots(res.slots)
    } catch {
      setSlotsError(true)
      toast.error('Could not load available slots. Please try again.')
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (currentStatus !== 'approved' || !applicationId) return
    fetchSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus, applicationId])

  const handleConfirm = async (chosenTime: string) => {
    if (!applicationId) return
    setSubmitting(true)
    try {
      const s = await api.confirmInterview(applicationId, chosenTime)
      setSlot(s)
      toast.success('Interview confirmed! Check your email for the Meet link.')
      onScheduled?.(s)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm interview.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReschedule = async (chosenTime: string) => {
    if (!applicationId) return
    setSubmitting(true)
    try {
      const s = await api.rescheduleInterview(applicationId, chosenTime)
      setSlot(s)
      setRescheduling(false)
      toast.success('Interview rescheduled!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reschedule.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentStatus) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="font-semibold">You haven't applied yet</p>
        <p className="text-sm text-muted-foreground">
          Browse our programs and apply to get started on your journey.
        </p>
        {navigateToApply && (
          <Button className="w-full" onClick={navigateToApply}>
            Apply Now
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {STAGES.map((stage, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx
        const Icon = stage.icon

        return (
          <div key={stage.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0',
                  done && 'bg-primary border-primary text-primary-foreground',
                  active && 'bg-primary/10 border-primary text-primary',
                  !done && !active && 'bg-muted border-border text-muted-foreground',
                )}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              {idx < STAGES.length - 1 && (
                <div className={cn('w-0.5 h-8 mt-1', done ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
            <div className="pb-8">
              <p
                className={cn(
                  'text-sm font-medium',
                  active || done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {stage.label}
              </p>
              {active && <p className="text-xs text-primary mt-0.5">Current stage</p>}
            </div>
          </div>
        )
      })}

      {/* Action cards */}
      <div className="mt-2 space-y-3">
        {currentStatus === 'approved' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Schedule Your Interview</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Pick a 30-minute slot with the admissions team. All times are in East Africa Time (EAT).
              </p>
              {slotsError && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-destructive">Could not load slots.</p>
                  <Button variant="outline" size="sm" onClick={fetchSlots}>Retry</Button>
                </div>
              )}
              <Button
                onClick={() => { if (!allSlots.length) fetchSlots(); setSlotDialogOpen(true) }}
                disabled={slotsLoading}
                className="w-full"
              >
                {slotsLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading slots…
                  </span>
                ) : (
                  <><Calendar className="w-4 h-4 mr-2" />Pick a Slot</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStatus === 'interview_scheduled' && slot && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Interview Booked</h3>
              </div>
              <Separator />
              <div className="rounded-lg bg-card border border-primary/10 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Interview time
                </p>
                <p className="text-sm font-bold">{formatFullDateTime(slot.chosen_time)} EAT</p>
              </div>
              {(slot.meet_url || slot.zoom_link) && (
                <a
                  href={slot.meet_url || slot.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Video className="w-4 h-4" />
                  {slot.meet_url ? 'Join Google Meet' : 'Join Meeting'}
                </a>
              )}
              {(() => {
                const hoursUntil = slot.chosen_time
                  ? (new Date(slot.chosen_time).getTime() - Date.now()) / 3_600_000
                  : 0
                return hoursUntil > 24 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (!allSlots.length) fetchSlots()
                      setSlotDialogOpen(true)
                    }}
                  >
                    Reschedule Interview
                  </Button>
                ) : hoursUntil > 0 ? (
                  <p className="text-xs text-center text-warning font-medium">
                    Interview in less than 24 hours — rescheduling is no longer available.
                  </p>
                ) : null
              })()}
            </CardContent>
          </Card>
        )}

        {currentStatus === 'interview_completed' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Interview Completed ✓</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Congratulations! Make an initial deposit of <strong>KSh 10,000</strong> to secure
                your enrollment.
              </p>
              <DepositProgress depositedAmount={depositedAmount} applicationStatus="interview_completed" />
              {depositedAmount < 10_000 && (
                <Button className="w-full" onClick={() => onRequestPayment?.()}>
                  Go to Payments
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {currentStatus === 'enrolled' && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-primary">Enrolled ✓</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Your initial deposit has been received. Please contact the admin to be added to the
                cohort and LMS.
              </p>
            </CardContent>
          </Card>
        )}

        {['pending', 'reviewed'].includes(currentStatus) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">What happens next</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Our admissions team will review your application. Once approved, you'll be able to
                schedule your interview directly from this dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Slot picker dialog — shared by both approved scheduling and reschedule */}
      <Dialog
        open={slotDialogOpen}
        onClose={() => setSlotDialogOpen(false)}
        title="Pick an Interview Slot"
        description="All times are in East Africa Time (EAT). Select a date then a time."
        className="max-w-2xl"
      >
        {slotsLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading available slots…
          </div>
        ) : slotsError ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-destructive">Could not load available slots.</p>
            <Button variant="outline" size="sm" onClick={fetchSlots}>Retry</Button>
          </div>
        ) : (
          <SlotPicker
            slots={allSlots}
            onConfirm={async (time) => {
              const isReschedule = currentStatus === 'interview_scheduled'
              if (isReschedule) {
                await handleReschedule(time)
              } else {
                await handleConfirm(time)
              }
              setSlotDialogOpen(false)
            }}
            submitting={submitting}
            confirmLabel={currentStatus === 'interview_scheduled' ? 'Reschedule Interview' : 'Confirm Interview'}
          />
        )}
      </Dialog>
    </div>
  )
}

// re-export for AvailableSlot type usage in parent
export type { AvailableSlot } from '../lib/api'
