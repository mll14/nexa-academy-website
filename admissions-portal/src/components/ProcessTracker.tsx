import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Calendar, CreditCard, RefreshCw, Video, UserPlus, X, Mail, MapPin } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Dialog } from './ui/dialog'
import { SlotPicker, formatFullDateTime } from './SlotPicker'
import { DepositProgress } from './DepositProgress'
import * as api from '../lib/api'
import type { AvailableSlot } from '../types'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import type { InterviewSlot } from '../types'
import type { InterviewType } from './SlotPicker'

export const STAGES = [
  { key: 'pending', label: 'Application Submitted', icon: CheckCircle2 },
  { key: 'reviewed', label: 'Under Review', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
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
  const [allSlots, setAllSlots] = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [, setRescheduling] = useState(false)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [extraGuests, setExtraGuests] = useState<string[]>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [savingGuests, setSavingGuests] = useState(false)

  useEffect(() => {
    setSlot(initialSlot ?? null)
  }, [initialSlot])

  useEffect(() => {
    setExtraGuests(slot?.extra_guests ?? [])
    setNewGuestEmail('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.id])

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

  const handleConfirm = async (chosenTime: string, interviewType: InterviewType) => {
    if (!applicationId) return
    setSubmitting(true)
    try {
      const s = await api.confirmInterview(applicationId, chosenTime, interviewType)
      setSlot(s)
      toast.success(interviewType === 'physical' ? 'Physical interview confirmed!' : 'Interview confirmed! Check your email for the meeting link.')
      onScheduled?.(s)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm interview.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReschedule = async (chosenTime: string, interviewType: InterviewType) => {
    if (!applicationId) return
    setSubmitting(true)
    try {
      const s = await api.rescheduleInterview(applicationId, chosenTime, interviewType)
      setSlot(s)
      setRescheduling(false)
      toast.success('Interview rescheduled!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reschedule.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveGuests = async () => {
    if (!applicationId) return
    setSavingGuests(true)
    try {
      const updated = await api.updateInterviewDetails(applicationId, { extra_guests: extraGuests })
      setSlot(updated)
      toast.success('Attendees updated — an email has been sent to the applicant.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update attendees.')
    } finally {
      setSavingGuests(false)
    }
  }

  const addGuest = () => {
    const email = newGuestEmail.trim()
    if (!email || extraGuests.includes(email)) return
    setExtraGuests((prev) => [...prev, email])
    setNewGuestEmail('')
  }

  const guestsChanged = JSON.stringify(extraGuests) !== JSON.stringify(slot?.extra_guests ?? [])

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

  // Countdown for scheduled interview
  const hoursUntilInterview = slot?.chosen_time
    ? (new Date(slot.chosen_time).getTime() - Date.now()) / 3_600_000
    : 0
  const daysUntil = Math.floor(hoursUntilInterview / 24)
  const countdownText = hoursUntilInterview <= 0 ? null
    : daysUntil >= 1 ? `That's in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
    : `That's in ${Math.ceil(hoursUntilInterview)} hour${Math.ceil(hoursUntilInterview) === 1 ? '' : 's'}`

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

        {/* Pending / Reviewed — reassure and explain */}
        {['pending', 'reviewed'].includes(currentStatus) && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Hang tight — we're reviewing your application</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Our admissions team is looking over your application. We usually get back to applicants within <strong>2–3 business days</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Once you're approved, you'll be able to book your interview right here on this page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Approved — schedule interview */}
        {currentStatus === 'approved' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Book your admissions interview</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Pick a <strong>30-minute slot</strong> with the admissions team. It's a relaxed conversation about your background and goals — no technical test involved.
              </p>
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What to expect</p>
                <p className="text-xs text-muted-foreground">
                  We'll chat about why you want to learn coding, your availability, and how you plan to manage the program. All times are shown in East Africa Time (EAT).
                </p>
              </div>
              {slotsError && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-destructive">Could not load available times.</p>
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
                    Loading available times…
                  </span>
                ) : (
                  <><Calendar className="w-4 h-4 mr-2" />Book My Interview Slot</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Interview Scheduled — details + tips */}
        {currentStatus === 'interview_scheduled' && slot && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Interview Booked</h3>
              </div>
              <Separator />

              {/* Date & time */}
              <div className="rounded-lg bg-card border border-primary/10 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your interview time</p>
                <p className="text-sm font-bold">{formatFullDateTime(slot.chosen_time)} EAT</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {slot.interview_type === 'physical' ? <MapPin className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  {slot.interview_type === 'physical' ? 'Physical interview at Nexa Academy' : 'Online interview'}
                </p>
                {countdownText && <p className="text-xs text-primary font-medium">{countdownText}</p>}
              </div>

              {/* Join meeting button — most prominent action */}
              {slot.interview_type !== 'physical' && (slot.meet_url || slot.zoom_link) ? (
                <a
                  href={slot.meet_url || slot.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Video className="w-5 h-5" />
                  Join Google Meet
                </a>
              ) : slot.interview_type === 'physical' ? (
                <div className="flex items-start gap-2 bg-card border rounded-lg px-3 py-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Visit Nexa Academy at 10th Floor, JKUAT Towers, CBD Nairobi. Check your email for any arrival details.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-card border rounded-lg px-3 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your Google Meet link will be sent to your email before the interview. Check your inbox (and spam folder) closer to the time.
                  </p>
                </div>
              )}

              {/* How to prepare */}
              <div className="rounded-lg bg-card border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How to prepare</p>
                <ul className="space-y-1.5">
                  {(slot.interview_type === 'physical'
                    ? [
                        'Plan to arrive a few minutes before the interview',
                        'Come to 10th Floor, JKUAT Towers, CBD Nairobi',
                        'Have a pen and paper ready for any notes',
                      ]
                    : [
                        'Test your Google Meet link a few minutes before the interview',
                        'Find a quiet place with a stable internet connection',
                        'Have a pen and paper ready for any notes',
                      ]
                  ).map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Extra attendees */}
              {slot.interview_type !== 'physical' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add people to the call (optional)</p>
                  {extraGuests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {extraGuests.map((g) => (
                        <span key={g} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1">
                          {g}
                          <button
                            onClick={() => setExtraGuests((prev) => prev.filter((e) => e !== g))}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      placeholder="Enter email address…"
                      value={newGuestEmail}
                      onChange={(e) => setNewGuestEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
                      className="flex-1 text-xs h-8 rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={addGuest}
                      disabled={!newGuestEmail.trim() || extraGuests.includes(newGuestEmail.trim())}
                      className="h-8 px-2.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-40 transition-colors shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {guestsChanged && (
                    <Button size="sm" className="w-full" disabled={savingGuests} onClick={handleSaveGuests}>
                      {savingGuests ? 'Saving…' : 'Save Attendees'}
                    </Button>
                  )}
                </div>
              )}

              {/* Reschedule */}
              {(() => {
                return hoursUntilInterview > 24 ? (
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
                ) : hoursUntilInterview > 0 ? (
                  <p className="text-xs text-center text-warning font-medium">
                    Your interview is less than 24 hours away — rescheduling is no longer available.
                  </p>
                ) : null
              })()}
            </CardContent>
          </Card>
        )}

        {/* Interview Completed — deposit prompt */}
        {currentStatus === 'interview_completed' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Interview Passed — Congratulations! 🎉</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                You're one step away from securing your place. Make a deposit of <strong>KSh 10,000</strong> to confirm your enrollment.
              </p>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                This deposit goes directly toward your total program fee — it's not an extra charge.
              </p>
              <DepositProgress depositedAmount={depositedAmount} applicationStatus="interview_completed" />
              {depositedAmount < 10_000 && (
                <Button className="w-full" onClick={() => onRequestPayment?.()}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Go to Payments
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enrolled — what happens next */}
        {currentStatus === 'enrolled' && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-success">You're Enrolled ✓</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Welcome to Nexa Academy! Here's what to do next:
              </p>
              <ol className="space-y-2">
                {[
                  'Check your email for your LMS (Moodle) login link and class schedule',
                  'Email admissions@nexaacademy.co.ke to be added to your cohort group',
                  'Continue paying your balance according to your payment plan',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-success/15 text-success text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Slot picker dialog */}
      <Dialog
        open={slotDialogOpen}
        onClose={() => setSlotDialogOpen(false)}
        title="Pick an Interview Slot"
        description="All times are in East Africa Time (EAT). Select a date then choose a time."
        className="max-w-2xl"
      >
        {slotsLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading available times…
          </div>
        ) : slotsError ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-destructive">Could not load available times.</p>
            <Button variant="outline" size="sm" onClick={fetchSlots}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={fetchSlots}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh available times
              </button>
            </div>
            <SlotPicker
              slots={allSlots}
              defaultInterviewType={slot?.interview_type}
              onConfirm={async (time, interviewType) => {
                const isReschedule = currentStatus === 'interview_scheduled'
                if (isReschedule) {
                  await handleReschedule(time, interviewType)
                } else {
                  await handleConfirm(time, interviewType)
                }
                setSlotDialogOpen(false)
              }}
              submitting={submitting}
              confirmLabel={currentStatus === 'interview_scheduled' ? 'Reschedule Interview' : 'Confirm Interview'}
            />
          </div>
        )}
      </Dialog>
    </div>
  )
}

// re-export for AvailableSlot type usage in parent
export type { AvailableSlot } from '../types'
