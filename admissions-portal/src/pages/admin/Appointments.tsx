import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Search, Video, MapPin, ChevronRight, Calendar, Plus,
  User, Briefcase, Clock, Mail, Check, ChevronLeft,
  AlertCircle, Loader2,
  Phone, ExternalLink, CheckCircle2, AlertTriangle, FileText, XCircle,
} from 'lucide-react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { AdminLayout } from '../../components/AdminLayout'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { UnderlineTabs } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import * as api from '../../lib/api'
import { formatDate, formatFullDateTime } from '../../lib/utils'
import type { Appointment, AppointmentType, AppointmentHost, AvailableSlot } from '../../types'
import { Pagination } from '../../components/ui/pagination'

// ── List page constants ───────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
] as const

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'physical', label: 'In Person' },
]

const HOST_OPTIONS = [
  { value: '', label: 'All Hosts' },
  { value: 'admissions_manager', label: 'Admissions Manager' },
  { value: 'technical_mentor', label: 'Technical Mentor' },
]

const SORT_OPTIONS = [
  { value: '-chosen_time', label: 'Soonest first' },
  { value: 'chosen_time', label: 'Oldest first' },
  { value: '-created_at', label: 'Recently booked' },
  { value: 'name', label: 'Name A–Z' },
]

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-yellow-100 text-yellow-700',
}

const PAGE_SIZE = 10

function formatAppointmentTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-all">{value ?? '—'}</span>
      </div>
    </div>
  )
}

function AppointmentDetailDialog({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const { data: appt, isLoading } = useQuery({
    queryKey: ['admin', 'appointment', appointmentId],
    queryFn: () => api.getAppointment(appointmentId!),
    enabled: !!appointmentId,
  })

  useEffect(() => {
    setNotes(appt?.admin_notes ?? '')
    setNotesEditing(false)
    setShowCancelConfirm(false)
  }, [appt?.id, appt?.admin_notes])

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; admin_notes?: string }) =>
      api.updateAppointment(appointmentId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointment', appointmentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      toast.success('Updated.')
      setNotesEditing(false)
    },
    onError: () => toast.error('Update failed.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelAppointment(appointmentId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointment', appointmentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      toast.success('Appointment cancelled.')
      setShowCancelConfirm(false)
    },
    onError: () => toast.error('Could not cancel appointment.'),
  })

  return (
    <Dialog
      open={!!appointmentId}
      onClose={onClose}
      title="Appointment Details"
      description={appt ? `Appointment ID: ${appt.id}` : undefined}
      className="max-w-lg"
    >
      {isLoading || !appt ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (() => {
        const isCancelled = appt.status === 'cancelled'
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-5 py-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Scheduled for</p>
                <p className="text-2xl font-bold font-heading mt-0.5 leading-tight">
                  {formatFullDateTime(appt.chosen_time)}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_STYLES[appt.status] ?? 'bg-muted text-muted-foreground'}`}>
                {appt.status_label}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Attendee</p>
              <div className="divide-y divide-border">
                <DetailRow icon={<User className="w-4 h-4" />} label="Name" value={appt.name} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={appt.email} />
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={appt.phone} />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Appointment</p>
              <div className="divide-y divide-border">
                <DetailRow
                  icon={appt.appointment_type === 'virtual' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  label="Format"
                  value={appt.appointment_type_label}
                />
                <DetailRow icon={<User className="w-4 h-4" />} label="Host" value={appt.host_label} />
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="Booked on" value={formatDate(appt.created_at)} />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Purpose</p>
              <p className="text-sm text-muted-foreground px-1 whitespace-pre-wrap">{appt.reason}</p>
            </div>

            {appt.appointment_type === 'virtual' && appt.meet_url && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Meeting Link</p>
                  <a
                    href={appt.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors break-all"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    {appt.meet_url}
                  </a>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Admin Notes</p>
              {notesEditing ? (
                <div className="space-y-3">
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about this appointment…"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ admin_notes: notes })}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save Notes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setNotes(appt.admin_notes ?? ''); setNotesEditing(false) }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground px-1 whitespace-pre-wrap">
                    {appt.admin_notes || 'No notes yet.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setNotesEditing(true)}>
                    {appt.admin_notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </div>
              )}
            </div>

            {!isCancelled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Actions</p>
                  {STATUS_OPTIONS.filter((option) => option.value !== appt.status).map(({ value, label }) => (
                    <Button
                      key={value}
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ status: value })}
                      disabled={updateMutation.isPending}
                    >
                      {value === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                      )}
                      Mark as {label}
                    </Button>
                  ))}

                  {!showCancelConfirm ? (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2 text-destructive" />
                      Cancel Appointment
                    </Button>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <Button
                        className="w-full"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel It'}
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setShowCancelConfirm(false)}
                      >
                        Keep Appointment
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })()}
    </Dialog>
  )
}

// ── Create appointment dialog ─────────────────────────────────────────────────

const CREATE_STEPS = ['Type & Host', 'Date & Time', 'Contact Details']

interface CreateForm {
  appointmentType: AppointmentType | ''
  host: AppointmentHost | ''
  chosenTime: string
  manualTime: string
  name: string
  email: string
  phone: string | undefined
  reason: string
  attendees: string[]
}

function groupSlotsByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const map = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.time.split('T')[0]
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(slot)
  }
  return map
}

function formatDateLabel(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function CreateStepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-6">
      {CREATE_STEPS.map((s, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done
                  ? 'bg-primary border-primary text-white'
                  : active
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`mt-1 text-[10px] font-medium hidden sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {s}
              </span>
            </div>
            {i < CREATE_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-14 mx-2 mb-3.5 rounded transition-all ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CreateAppointmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CreateForm>({
    appointmentType: '', host: '', chosenTime: '', manualTime: '', name: '', email: '', phone: '', reason: '', attendees: [],
  })
  const [attendeeInput, setAttendeeInput] = useState('')
  const [useManualTime, setUseManualTime] = useState(false)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof CreateForm, string>>>({})

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots])
  const availableDates = useMemo(
    () => [...slotsByDate.keys()].filter(d => slotsByDate.get(d)!.some(s => s.status === 'available')),
    [slotsByDate],
  )

  useEffect(() => {
    if (!open) return
    setStep(0)
    setForm({ appointmentType: '', host: '', chosenTime: '', manualTime: '', name: '', email: '', phone: '', reason: '', attendees: [] })
    setAttendeeInput('')
    setUseManualTime(false)
    setSlots([])
    setSelectedDate('')
    setErrors({})
  }, [open])

  useEffect(() => {
    if (step !== 1) return
    setSlotsLoading(true)
    setSlotsError(false)
    api.getAppointmentAvailableSlots().then((data) => {
      setSlots(data)
      setSlotsLoading(false)
      if (data.length === 0) setSlotsError(true)
    }).catch(() => { setSlotsLoading(false); setSlotsError(true) })
  }, [step])

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) setSelectedDate(availableDates[0])
  }, [availableDates, selectedDate])

  function setField<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const chosenTime = useManualTime
        ? new Date(form.manualTime).toISOString()
        : form.chosenTime
      return api.createAppointment({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone ?? '',
        appointment_type: form.appointmentType as AppointmentType,
        host: form.host as AppointmentHost,
        chosen_time: chosenTime,
        reason: form.reason.trim(),
        attendees: form.attendees.length > 0 ? form.attendees : undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      toast.success('Appointment created.')
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create appointment.')
    },
  })

  function validateStep0() {
    const errs: typeof errors = {}
    if (!form.appointmentType) errs.appointmentType = 'Select an appointment type.'
    if (!form.host) errs.host = 'Select a host.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1() {
    if (useManualTime) {
      if (!form.manualTime) { setErrors({ manualTime: 'Enter a date and time.' }); return false }
    } else {
      if (!form.chosenTime) { setErrors({ chosenTime: 'Please select a time slot.' }); return false }
    }
    return true
  }

  function validateStep2() {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required.'
    if (!form.phone || !isValidPhoneNumber(form.phone)) errs.phone = 'Valid phone number required.'
    if (!form.reason.trim()) errs.reason = 'Purpose is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    const validators = [validateStep0, validateStep1, validateStep2]
    if (validators[step]()) setStep(s => s + 1)
  }

  function handleSubmit() {
    if (!validateStep2()) return
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Appointment" className="max-w-lg w-full">
      <div className="p-5">
        <CreateStepIndicator current={step + 1} />

        {/* Step 0 — Type & Host */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-2">Appointment type</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'virtual', label: 'Virtual', sub: 'Google Meet', icon: Video },
                  { value: 'physical', label: 'In Person', sub: 'Office visit', icon: MapPin },
                ] as const).map(({ value, label, sub, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField('appointmentType', value)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      form.appointmentType === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      form.appointmentType === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.appointmentType && <p className="text-destructive text-xs mt-1.5">{errors.appointmentType}</p>}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Who will host?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'admissions_manager', label: 'Admissions Manager', sub: 'Fees & enrollment', icon: Briefcase },
                  { value: 'technical_mentor', label: 'Technical Mentor', sub: 'Curriculum & careers', icon: User },
                ] as const).map(({ value, label, sub, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField('host', value)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      form.host === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      form.host === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.host && <p className="text-destructive text-xs mt-1.5">{errors.host}</p>}
            </div>
          </div>
        )}

        {/* Step 1 — Date & Time */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Select a time slot</p>
              <button
                type="button"
                onClick={() => { setUseManualTime(v => !v); setField('chosenTime', ''); setField('manualTime', '') }}
                className="text-xs text-primary hover:underline"
              >
                {useManualTime ? 'Use available slots' : 'Enter time manually'}
              </button>
            </div>

            {useManualTime ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.manualTime}
                  onChange={(e) => setField('manualTime', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {errors.manualTime && <p className="text-destructive text-xs mt-1">{errors.manualTime}</p>}
              </div>
            ) : (
              <>
                {slotsLoading && (
                  <div className="flex items-center justify-center h-36 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Checking available times…</span>
                  </div>
                )}
                {slotsError && !slotsLoading && (
                  <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Could not load slots. Use manual entry instead.
                  </div>
                )}
                {!slotsLoading && !slotsError && availableDates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No available slots. Use manual time entry above.
                  </p>
                )}
                {!slotsLoading && !slotsError && availableDates.length > 0 && (
                  <div className="grid grid-cols-[150px_1fr] gap-3">
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Date
                      </p>
                      {availableDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => { setSelectedDate(d); setField('chosenTime', '') }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                            selectedDate === d ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted'
                          }`}
                        >
                          {formatDateLabel(d)}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </p>
                      {selectedDate ? (
                        <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
                          {(slotsByDate.get(selectedDate) ?? []).map((slot) => {
                            const isAvailable = slot.status === 'available'
                            const isSelected = form.chosenTime === slot.time
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => isAvailable && setField('chosenTime', slot.time)}
                                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : isAvailable
                                      ? 'border-border hover:border-primary/50 hover:bg-primary/5'
                                      : 'border-border/30 text-muted-foreground/40 cursor-not-allowed bg-muted/30'
                                }`}
                              >
                                {formatTimeLabel(slot.time)}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Select a date first.</p>
                      )}
                    </div>
                  </div>
                )}
                {errors.chosenTime && <p className="text-destructive text-xs mt-1">{errors.chosenTime}</p>}
              </>
            )}
          </div>
        )}

        {/* Step 2 — Contact Details */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </div>
                {errors.name && <p className="text-destructive text-xs mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    type="email"
                    placeholder="jane@email.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </div>
                {errors.email && <p className="text-destructive text-xs mt-0.5">{errors.email}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Phone Number</label>
              <PhoneInput
                defaultCountry="KE"
                international
                value={form.phone}
                onChange={(v) => { setField('phone', v); setErrors(e => ({ ...e, phone: undefined })) }}
                placeholder="Enter phone number"
                className="w-full h-9 rounded-lg border border-border bg-background text-sm px-3"
              />
              {errors.phone && <p className="text-destructive text-xs mt-0.5">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Purpose of appointment</label>
              <textarea
                rows={3}
                placeholder="What would this person like to discuss?"
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.reason && <p className="text-destructive text-xs mt-0.5">{errors.reason}</p>}
            </div>

            {/* Extra attendees — virtual only */}
            {form.appointmentType === 'virtual' && (
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Invite others to the Meet <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@email.com"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = attendeeInput.trim().toLowerCase()
                        if (/\S+@\S+\.\S+/.test(v) && !form.attendees.includes(v) && v !== (form.email || '').toLowerCase()) {
                          setField('attendees', [...form.attendees, v])
                          setAttendeeInput('')
                        }
                      }
                    }}
                    className="h-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = attendeeInput.trim().toLowerCase()
                      if (/\S+@\S+\.\S+/.test(v) && !form.attendees.includes(v) && v !== (form.email || '').toLowerCase()) {
                        setField('attendees', [...form.attendees, v])
                        setAttendeeInput('')
                      }
                    }}
                    className="px-3 h-9 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
                {form.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.attendees.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {a}
                        <button
                          type="button"
                          onClick={() => setField('attendees', form.attendees.filter(x => x !== a))}
                          className="hover:text-destructive transition-colors ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 border">
              <p className="font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Summary</p>
              <p><span className="text-muted-foreground">Type:</span> {form.appointmentType === 'virtual' ? 'Virtual (Google Meet)' : 'In Person'}</p>
              <p><span className="text-muted-foreground">Host:</span> {form.host === 'admissions_manager' ? 'Admissions Manager' : 'Technical Mentor'}</p>
              <p>
                <span className="text-muted-foreground">Time:</span>{' '}
                {useManualTime && form.manualTime
                  ? new Date(form.manualTime).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                  : form.chosenTime
                    ? new Date(form.chosenTime).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={createMutation.isPending}
              className="flex-none w-24 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
            >
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {createMutation.isPending ? 'Creating…' : 'Create Appointment'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

// ── Appointments list page ────────────────────────────────────────────────────

export function Appointments() {
  const [statusTab, setStatusTab] = useState<string>('all')
  const [apptType, setApptType] = useState('')
  const [host, setHost] = useState('')
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-chosen_time')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', { statusTab, apptType, host, search, ordering, page }],
    queryFn: () =>
      api.getAppointments({
        status: statusTab === 'all' ? undefined : statusTab,
        appointment_type: apptType || undefined,
        host: host || undefined,
        search: search || undefined,
        ordering,
        page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  })

  const appointments: Appointment[] = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminLayout>
      <CreateAppointmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Appointments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? 'Loading…' : `${total} appointment${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create Appointment</span>
          </button>
        </div>

        <UnderlineTabs
          tabs={[...STATUS_TABS]}
          active={statusTab}
          onChange={(v) => { setStatusTab(v); setPage(1) }}
          className="overflow-x-auto"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select
            value={apptType}
            onChange={(value) => { setApptType(value); setPage(1) }}
            options={TYPE_OPTIONS}
            className="w-40"
          />
          <Select
            value={host}
            onChange={(value) => { setHost(value); setPage(1) }}
            options={HOST_OPTIONS}
            className="w-52"
          />
          <Select
            value={ordering}
            onChange={(value) => setOrdering(value)}
            options={SORT_OPTIONS}
            className="w-44"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">With</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3" colSpan={6}>
                        <div className="h-4 bg-muted rounded w-full" />
                      </td>
                    </tr>
                  ))
                : appointments.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No appointments found.
                    </td>
                  </tr>
                )
                : appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedAppointmentId(appt.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{appt.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {appt.appointment_type === 'virtual'
                          ? <Video className="w-3.5 h-3.5" />
                          : <MapPin className="w-3.5 h-3.5" />}
                        {appt.appointment_type_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {appt.host_label}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {formatAppointmentTime(appt.chosen_time)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[appt.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {appt.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        />
      </div>
    </AdminLayout>
  )
}
