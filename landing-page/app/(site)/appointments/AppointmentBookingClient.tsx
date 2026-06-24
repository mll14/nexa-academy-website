'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  Video, MapPin, User, Briefcase, ChevronRight, ChevronLeft,
  Calendar, Clock, Mail, Phone, CheckCircle2, AlertCircle, Loader2,
  Check, Users, Star, MessageCircle, Zap, Award, Heart, BookOpen,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { getAppointmentSlots, bookAppointment } from '@/lib/api/appointments'
import type { AppointmentSlot } from '@/lib/api/appointments'
import type { AppointmentsPageData } from './page'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Video, MapPin, Users, Star, MessageCircle, Zap, Award, Heart, BookOpen,
  Calendar, Mail, Phone, CheckCircle2, User, Briefcase,
}

function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = name ? (ICON_MAP[name] ?? Star) : Star
  return <Icon className={className} />
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AppointmentType = 'physical' | 'virtual'
type Host = 'admissions_manager' | 'technical_mentor'

interface FormState {
  appointmentType: AppointmentType | ''
  host: Host | ''
  chosenTime: string
  name: string
  email: string
  phone: string
  reason: string
  attendees: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupSlotsByDate(slots: AppointmentSlot[]): Map<string, AppointmentSlot[]> {
  const map = new Map<string, AppointmentSlot[]>()
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

function formatFullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const STEPS = ['Type & Host', 'Date & Time', 'Your Details']

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done
                  ? 'bg-primary border-primary text-white'
                  : active
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground'
              }`}>
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`mt-1.5 text-xs font-medium hidden sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 rounded transition-all ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  { title: 'Meet the team in person', description: 'Get a real sense of the learning environment and culture.' },
  { title: 'Ask any question', description: 'No pressure — bring your concerns and we\'ll walk you through everything.' },
  { title: 'Virtual or in-person', description: 'Choose what works for you — Google Meet or visit our Nairobi office.' },
]

const DEFAULT_BENEFITS = [
  { icon: 'Users', title: 'Meet Instructors & Mentors', description: 'Get face time with the people who will guide your learning journey at Nexa Academy.' },
  { icon: 'BookOpen', title: 'Explore the Curriculum', description: 'Walk through what you will build and learn in each program with an industry expert.' },
  { icon: 'MessageCircle', title: 'Get Honest Answers', description: 'Ask any question — about fees, time commitment, outcomes, or career paths — without sales pressure.' },
  { icon: 'Zap', title: 'Fast-Track Your Application', description: 'Admissions visits can significantly speed up the enrollment process for qualified candidates.' },
  { icon: 'MapPin', title: 'See the Campus', description: 'Tour our 10th floor Nairobi campus and see where you\'ll spend the next few months.' },
  { icon: 'Star', title: 'Personalised Guidance', description: 'Get a tailored recommendation for which program best fits your background and goals.' },
]

const DEFAULT_NEXT_STEPS = [
  'Choose your preferred date & time',
  'Receive a calendar invite and confirmation email',
  'Join the call or visit our office',
]

// ── Main component ────────────────────────────────────────────────────────────

export function AppointmentBookingClient({ data }: { data: AppointmentsPageData }) {
  const {
    badge = 'Book a Visit',
    headline = 'Meet the Nexa Team',
    subheadline = 'Whether you want to learn more about our programs, get a feel for the space, or speak to a mentor — book a quick chat with us.',
    heroCtaPrimary,
    heroCtaSecondary,
    benefitsBadge = 'Why Visit Us',
    benefitsHeadline = 'What to expect from your visit',
    benefitsSubheadline,
    benefits = DEFAULT_BENEFITS,
    ctaHeadline = 'Ready to take the next step?',
    ctaSubheadline,
    ctaButtonLabel = 'Book an Appointment',
    formBadge = 'Schedule a Visit',
    formHeadline = 'Book Your Appointment',
    formSubheadline = 'Fill in the details below to schedule a virtual or in-person meeting with our team.',
    features = DEFAULT_FEATURES,
    nextSteps = DEFAULT_NEXT_STEPS,
    officeAddress = '10th Floor, JKUAT Towers, CBD Nairobi',
    officeMapUrl,
  } = data

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({
    appointmentType: '', host: '', chosenTime: '', name: '', email: '', phone: '', reason: '', attendees: [],
  })
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [attendeeInput, setAttendeeInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots])
  const availableDates = useMemo(
    () => [...slotsByDate.keys()].filter(d => d > today && slotsByDate.get(d)!.some(s => s.status === 'available')),
    [slotsByDate, today],
  )

  useEffect(() => {
    if (step !== 1) return
    setSlotsLoading(true)
    setSlotsError(false)
    getAppointmentSlots().then((d) => {
      setSlots(d)
      setSlotsLoading(false)
      if (d.length === 0) setSlotsError(true)
    }).catch(() => { setSlotsLoading(false); setSlotsError(true) })
  }, [step])

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) setSelectedDate(availableDates[0])
  }, [availableDates, selectedDate])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validateStep0() {
    const errs: typeof errors = {}
    if (!form.appointmentType) errs.appointmentType = 'Select an appointment type.'
    if (!form.host) errs.host = 'Select who you\'d like to meet.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1() {
    if (!form.chosenTime) { setErrors({ chosenTime: 'Please select a time slot.' }); return false }
    return true
  }

  function validateStep2() {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = 'Please enter your name.'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required.'
    if (!form.phone.trim()) errs.phone = 'Please enter your phone number.'
    if (!form.reason.trim()) errs.reason = 'Please describe the purpose of your appointment.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    const validators = [validateStep0, validateStep1, validateStep2]
    if (validators[step]()) setStep(s => s + 1)
  }

  async function handleSubmit() {
    if (!validateStep2()) return
    setSubmitting(true)
    setSubmitError('')
    const result = await bookAppointment({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      appointment_type: form.appointmentType as AppointmentType,
      host: form.host as Host,
      chosen_time: form.chosenTime,
      reason: form.reason.trim(),
      attendees: form.attendees.length > 0 ? form.attendees : undefined,
    })
    setSubmitting(false)
    if (result.success) setDone(true)
    else setSubmitError(result.error ?? 'Something went wrong. Please try again.')
  }

  if (done) {
    return (
      <SuccessScreen
        name={form.name}
        chosenTime={form.chosenTime}
        appointmentType={form.appointmentType as AppointmentType}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden py-20 md:py-28 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {badge && (
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-5">
              {badge}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-5">
            {headline}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/75 max-w-2xl mx-auto mb-8 leading-relaxed">
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={heroCtaPrimary?.url ?? '#book-form'}
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold px-7 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              {heroCtaPrimary?.label ?? 'Book an Appointment'} <ChevronRight className="w-4 h-4" />
            </a>
            {(heroCtaSecondary?.url || heroCtaSecondary?.label) && (
              <a
                href={heroCtaSecondary.url ?? '/programs'}
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
              >
                {heroCtaSecondary.label ?? 'Browse Programs'}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      {benefits?.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 space-y-3">
              {benefitsBadge && (
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                  {benefitsBadge}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{benefitsHeadline}</h2>
              {benefitsSubheadline && (
                <p className="text-muted-foreground max-w-xl mx-auto">{benefitsSubheadline}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((b, i) => (
                <div key={i} className="bg-background rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <DynamicIcon name={b.icon} className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-1.5">{b.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Strip ── */}
      {ctaHeadline && (
        <section className="bg-primary text-primary-foreground py-14 md:py-16">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{ctaHeadline}</h2>
            {ctaSubheadline && (
              <p className="text-primary-foreground/75 mb-7 text-base">{ctaSubheadline}</p>
            )}
            <a
              href="#book-form"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-7 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              {ctaButtonLabel} <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      )}

      {/* ── Booking Form ── */}
      <section id="book-form" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          {formBadge && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              {formBadge}
            </span>
          )}
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{formHeadline}</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
          {formSubheadline && <p className="text-muted-foreground text-sm">{formSubheadline}</p>}
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-10">
          <StepIndicator current={step + 1} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Form card ── */}
          <div className="lg:col-span-8">
            <Card className="border border-border rounded-2xl">
              <CardContent className="p-6 sm:p-8">

                {/* Step 0 — Type & Host */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-semibold mb-3">How would you like to meet?</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {([
                          { value: 'virtual', label: 'Virtual', sub: 'Google Meet call', icon: Video },
                          { value: 'physical', label: 'In Person', sub: 'Visit our Nairobi office', icon: MapPin },
                        ] as const).map(({ value, label, sub, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setField('appointmentType', value)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              form.appointmentType === value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              form.appointmentType === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{label}</p>
                              <p className="text-xs text-muted-foreground">{sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {errors.appointmentType && (
                        <p className="text-destructive text-xs mt-2">{errors.appointmentType}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-3">Who would you like to meet?</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {([
                          { value: 'admissions_manager', label: 'Admissions Manager', sub: 'Program info, fees & enrollment', icon: Briefcase },
                          { value: 'technical_mentor', label: 'Technical Mentor', sub: 'Curriculum, projects & career paths', icon: User },
                        ] as const).map(({ value, label, sub, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setField('host', value)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              form.host === value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              form.host === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{label}</p>
                              <p className="text-xs text-muted-foreground">{sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {errors.host && <p className="text-destructive text-xs mt-2">{errors.host}</p>}
                    </div>
                  </div>
                )}

                {/* Step 1 — Date & Time */}
                {step === 1 && (
                  <div>
                    {slotsLoading && (
                      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Checking available times…</span>
                      </div>
                    )}
                    {slotsError && !slotsLoading && (
                      <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Could not load available slots. Please refresh and try again.
                      </div>
                    )}
                    {!slotsLoading && !slotsError && availableDates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No available slots in the next 2 weeks. Please check back soon.
                      </p>
                    )}
                    {!slotsLoading && !slotsError && availableDates.length > 0 && (
                      <div className="grid sm:grid-cols-[180px_1fr] gap-4">
                        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Select Date
                          </p>
                          {availableDates.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { setSelectedDate(d); setField('chosenTime', '') }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                selectedDate === d
                                  ? 'bg-primary text-primary-foreground font-semibold'
                                  : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              {formatDateLabel(d)}
                            </button>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Select Time
                          </p>
                          {selectedDate ? (
                            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                              {(slotsByDate.get(selectedDate) ?? []).map((slot) => {
                                const isAvailable = slot.status === 'available'
                                const isSelected = form.chosenTime === slot.time
                                return (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={!isAvailable}
                                    onClick={() => isAvailable && setField('chosenTime', slot.time)}
                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                                      isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : isAvailable
                                          ? 'border-border hover:border-primary/50 hover:bg-primary/5'
                                          : 'border-border/30 text-muted-foreground/40 cursor-not-allowed bg-muted/30'
                                    }`}
                                  >
                                    {formatTimeLabel(slot.time)}
                                    {!isAvailable && (
                                      <span className="block text-[10px] text-muted-foreground/50 leading-tight">
                                        {slot.status === 'busy' ? 'Taken' : slot.status === 'holiday' ? 'Holiday' : 'Blocked'}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Select a date to see available times.</p>
                          )}
                        </div>
                      </div>
                    )}
                    {errors.chosenTime && (
                      <p className="text-destructive text-xs mt-3">{errors.chosenTime}</p>
                    )}
                  </div>
                )}

                {/* Step 2 — Personal Details */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            placeholder="Jane Doe"
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                          />
                        </div>
                        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            type="email"
                            placeholder="jane@email.com"
                            value={form.email}
                            onChange={(e) => setField('email', e.target.value)}
                          />
                        </div>
                        {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          type="tel"
                          placeholder="+254 7XX XXX XXX"
                          value={form.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                        />
                      </div>
                      {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">What would you like to discuss?</label>
                      <Textarea
                        placeholder="E.g. I want to learn more about the software engineering program…"
                        rows={4}
                        value={form.reason}
                        onChange={(e) => setField('reason', e.target.value)}
                      />
                      {errors.reason && <p className="text-destructive text-xs mt-1">{errors.reason}</p>}
                    </div>

                    {/* Extra attendees — virtual only */}
                    {form.appointmentType === 'virtual' && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Invite others to the Google Meet <span className="text-muted-foreground font-normal">(optional)</span></label>
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
                                if (/\S+@\S+\.\S+/.test(v) && !form.attendees.includes(v) && v !== form.email.toLowerCase()) {
                                  set('attendees', [...form.attendees, v])
                                  setAttendeeInput('')
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const v = attendeeInput.trim().toLowerCase()
                              if (/\S+@\S+\.\S+/.test(v) && !form.attendees.includes(v) && v !== form.email.toLowerCase()) {
                                set('attendees', [...form.attendees, v])
                                setAttendeeInput('')
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Add
                          </button>
                        </div>
                        {form.attendees.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {form.attendees.map((a) => (
                              <span key={a} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {a}
                                <button type="button" onClick={() => set('attendees', form.attendees.filter(x => x !== a))} className="hover:text-destructive transition-colors">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1.5 border">
                      <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Booking Summary</p>
                      <p><span className="text-muted-foreground">Type:</span> {form.appointmentType === 'virtual' ? 'Virtual (Google Meet)' : 'In Person'}</p>
                      <p><span className="text-muted-foreground">With:</span> {form.host === 'admissions_manager' ? 'Admissions Manager' : 'Technical Mentor'}</p>
                      <p><span className="text-muted-foreground">Time:</span> {form.chosenTime ? formatFullDateTime(form.chosenTime) : '—'}</p>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-8 pt-6 border-t">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep(s => s - 1)}
                      className="flex-none w-28 h-11 rounded-lg border border-border font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : <div />}

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submitting ? 'Booking…' : 'Confirm Appointment'}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">

            {/* Why book */}
            {features.length > 0 && (
              <Card className="border border-border rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why book a visit?</p>
                  <ol className="space-y-3">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{f.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Office location (physical only) */}
            {form.appointmentType === 'physical' && (
              <Card className="border border-border rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Office Location
                  </p>
                  <p className="text-sm font-medium">{officeAddress}</p>
                  {officeMapUrl && (
                    <a
                      href={officeMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-xs font-semibold text-primary hover:underline"
                    >
                      Open in Google Maps →
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Next steps */}
            {nextSteps.length > 0 && (
              <Card className="border border-border rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What happens next?</p>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    {nextSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Contact */}
            <Card className="border border-border rounded-2xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact</p>
                <p className="text-sm text-muted-foreground">Questions before you book?</p>
                <a href="mailto:admissions@nexaacademy.co.ke" className="text-sm font-medium text-primary hover:underline block mt-2">
                  admissions@nexaacademy.co.ke
                </a>
                <a href="tel:+254713067311" className="text-sm font-medium text-primary hover:underline block mt-1">
                  +254 713 067 311
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  name, chosenTime, appointmentType,
}: { name: string; chosenTime: string; appointmentType: AppointmentType }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-3">Appointment confirmed!</h1>
        <p className="text-muted-foreground mb-6">
          Thanks, <strong>{name}</strong>. Your {appointmentType === 'virtual' ? 'virtual' : 'in-person'} appointment
          {chosenTime && ` on ${formatFullDateTime(chosenTime)}`} is booked.
          Check your email for the confirmation and{' '}
          {appointmentType === 'virtual' ? 'Google Meet link.' : 'directions to our office.'}
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/apply"
            className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply Now
          </a>
          <a
            href="/programs"
            className="text-sm font-semibold px-5 py-2.5 rounded-lg border hover:bg-muted transition-colors"
          >
            Browse Programs
          </a>
        </div>
      </div>
    </div>
  )
}
