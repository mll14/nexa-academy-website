import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { isValidPhoneNumber } from 'react-phone-number-input'
import {
  User, Mail, BookOpen, CalendarDays, Wallet,
  ChevronRight, ChevronLeft, Check, CheckCircle2, ClipboardList, PenLine, AlertCircle,
} from 'lucide-react'
import { StudentLayout } from '../components/StudentLayout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select } from '../components/ui/select'
import { PhoneNumberInput } from '../components/ui/phone-input'
import { Card, CardContent } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { Badge } from '../components/ui/badge'
import * as api from '../lib/api'
import { calcFee } from '../lib/utils'
import { getRecaptchaToken } from '../lib/recaptcha'
import toast from 'react-hot-toast'
import type { Program, Intake } from '../types'

const PAYMENT_PLANS = [
  { id: 'full', name: 'One-time Payment', note: 'Best discount' },
  { id: 'installment2', name: '2 Instalments', note: '10% surcharge' },
  { id: 'installment3', name: '3 Instalments', note: '20% surcharge' },
]

const MODE_OPTIONS = [
  { value: 'full_time_hybrid', label: 'Full-time Hybrid', intensity: 'Full-time', format: 'Hybrid', desc: 'On-site + online sessions, 40 hrs/wk' },
  { value: 'full_time_remote', label: 'Full-time Remote', intensity: 'Full-time', format: 'Remote', desc: '100% online learning, 40 hrs/wk' },
  { value: 'part_time_hybrid', label: 'Part-time Hybrid', intensity: 'Part-time', format: 'Hybrid', desc: 'On-site + online sessions, 20 hrs/wk' },
  { value: 'part_time_remote', label: 'Part-time Remote', intensity: 'Part-time', format: 'Remote', desc: '100% online learning, 20 hrs/wk' },
]

const STEPS = [{ label: 'About You' }, { label: 'Program & Plan' }, { label: 'Review & Submit' }]

const DEFAULT_TIMELINE = [
  { label: 'Application review', value: 'Under 2 hours' },
  { label: 'Admissions follow-up', value: 'Under 24 hours' },
  { label: 'Final enrollment', value: '24-48 hours' },
]

const DEFAULT_NEXT_STEPS = [
  'Our admissions team reviews your goals',
  'Optional orientation call with a mentor',
  'Final onboarding into the program group',
]

interface FormData {
  fullName: string
  email: string
  phone: string
  hasBasicKnowledge: string
  knowledgeDescription: string
  program: string
  startDate: string
  paymentPlan: string
  message: string
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function Field({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{required ? ' *' : ''}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const num = i + 1
        const done = num < currentStep
        const active = num === currentStep
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? 'bg-primary border-primary text-primary-foreground'
                    : active
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`mt-1.5 text-xs font-medium hidden sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.label}
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

function SuccessScreen({ data, onLogin }: { data: FormData; onLogin: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold">Application Submitted!</h1>
          <p className="text-muted-foreground">
            Thank you, <strong>{data.fullName}</strong>. We have received your application and will review it shortly.
          </p>
        </div>
        <Card>
          <CardContent className="p-5 text-sm space-y-2">
            {[
              { label: 'Email', value: data.email },
              { label: 'Program', value: data.program === '__help_me__' ? 'Program guidance' : data.program },
              { label: 'Start Date', value: data.startDate ? fmtDate(data.startDate) : 'To be confirmed' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          Check your email for confirmation. Once approved, log in to track your application.
        </p>
        <Button className="w-full" onClick={onLogin}>
          Go to Login
        </Button>
      </div>
    </div>
  )
}

function ComingSoonForm({
  name, email, phone, programSlug, programName, onDone,
}: {
  name: string
  email: string
  phone?: string
  programSlug: string
  programName: string
  onDone: () => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Enter your name and email first')
      return
    }
    setLoading(true)
    try {
      await api.submitComingSoonInterest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || undefined,
        program_slug: programSlug,
        program_name: programName,
        message: message.trim() || undefined,
      })
      toast.success('You are on the list. We will notify you when it opens.')
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register interest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">No open intakes right now for {programName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register your interest and we will notify you when the next cohort opens.
          </p>
        </div>
      </div>
      <Textarea
        rows={2}
        placeholder="Any message for the admissions team? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={loading}
      />
      <Button type="button" className="w-full" onClick={submit} disabled={loading}>
        {loading ? 'Registering...' : 'Notify Me When It Opens'}
      </Button>
    </div>
  )
}

export function Apply() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/apply' }) as { program?: string }

  const [programs, setPrograms] = useState<Program[]>([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [intakesLoading, setIntakesLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'mode' | 'submit', string>>>({})
  const [showSuccess, setShowSuccess] = useState(false)

  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    hasBasicKnowledge: '',
    knowledgeDescription: '',
    program: search.program ?? '',
    startDate: '',
    paymentPlan: 'full',
    message: '',
  })

  useEffect(() => {
    api
      .getPrograms({ status: 'active' })
      .then(setPrograms)
      .catch(() => setPrograms([]))
      .finally(() => setProgramsLoading(false))
  }, [])

  const currentProgram = useMemo(
    () => programs.find((p) => p.slug === form.program),
    [programs, form.program],
  )

  const fetchIntakes = useCallback(async (programSlug: string) => {
    setIntakesLoading(true)
    try {
      const all = await api.getIntakes({ program_slug: programSlug, status: 'open' })
      setIntakes(all.filter((intake) => intake.status === 'open' || intake.status === 'draft'))
    } catch {
      setIntakes([])
    } finally {
      setIntakesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!form.program || form.program === '__help_me__') {
      setIntakes([])
      setSelectedMode('')
      setForm((p) => ({ ...p, startDate: '' }))
      return
    }
    setSelectedMode('')
    setForm((p) => ({ ...p, startDate: '' }))
    fetchIntakes(form.program)
  }, [form.program, fetchIntakes])

  const availableModes = useMemo(
    () => MODE_OPTIONS.filter((mode) => intakes.some((intake) => intake.mode === mode.value)),
    [intakes],
  )

  const modeFilteredIntakes = useMemo(
    () => selectedMode ? intakes.filter((intake) => intake.mode === selectedMode) : [],
    [intakes, selectedMode],
  )

  const selectedIntake = useMemo(
    () => intakes.find((intake) => intake.start_date === form.startDate && intake.mode === selectedMode) ?? null,
    [intakes, form.startDate, selectedMode],
  )

  useEffect(() => {
    if (!selectedMode) {
      setForm((p) => ({ ...p, startDate: '' }))
      return
    }
    setForm((p) => {
      const alreadyValid = modeFilteredIntakes.some((intake) => intake.start_date === p.startDate)
      return alreadyValid ? p : { ...p, startDate: modeFilteredIntakes[0]?.start_date ?? '' }
    })
  }, [selectedMode, modeFilteredIntakes])

  const set = (field: keyof FormData) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
  ) => {
    const val = typeof e === 'string' ? e : e.target.value
    setForm((p) => ({ ...p, [field]: val }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const saveDraft = async (stepReached = step) => {
    if (!/\S+@\S+\.\S+/.test(form.email)) return
    try {
      await api.saveDraft({
        email: form.email.trim().toLowerCase(),
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        program: form.program,
        program_name: currentProgram?.name ?? '',
        step_reached: stepReached,
      })
    } catch {
      /* best effort */
    }
  }

  const validateStep1 = () => {
    const e: typeof errors = {}
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Full name is required (min 2 chars)'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'A valid email is required'
    if (!form.phone || !isValidPhoneNumber(form.phone)) e.phone = 'A valid phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: typeof errors = {}
    if (!form.program) e.program = 'Please choose a program'
    if (
      form.program &&
      form.program !== '__help_me__' &&
      !currentProgram?.coming_soon &&
      availableModes.length > 0 &&
      !selectedMode
    ) {
      e.mode = 'Please choose a program type'
    }
    if (
      form.program !== '__help_me__' &&
      !currentProgram?.coming_soon &&
      selectedMode &&
      modeFilteredIntakes.length > 0 &&
      !form.startDate
    ) {
      e.startDate = 'Please choose a start date'
    }
    if (form.program && form.program !== '__help_me__' && !currentProgram?.coming_soon) {
      if (!form.hasBasicKnowledge) e.hasBasicKnowledge = 'Please indicate if you have basic knowledge'
      if (form.hasBasicKnowledge === 'yes' && !form.knowledgeDescription.trim()) {
        e.knowledgeDescription = 'Please describe what you know'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = async () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    await saveDraft(step + 1)
    setStep((s) => Math.min(s + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goPrev = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const base = currentProgram?.price ?? 0
  const total = calcFee(base, form.paymentPlan)
  const inst2Per = Math.round((base * 1.1) / 2 / 500) * 500
  const inst3Per = Math.round((base * 1.2) / 3 / 500) * 500
  const selectedModeLabel = MODE_OPTIONS.find((mode) => mode.value === selectedMode)?.label ?? selectedMode

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (form.program === '__help_me__') {
        await api.submitHelpMeLead({
          name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
        })
        setShowSuccess(true)
        return
      }

      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await getRecaptchaToken('application_submit')
      } catch {
        // Non-fatal here; the API decides whether reCAPTCHA is required.
      }
      if (!recaptchaToken) {
        toast.error('reCAPTCHA could not be verified. Refresh the page and try again.')
        return
      }

      await api.submitApplication({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        has_basic_knowledge: form.hasBasicKnowledge === 'yes',
        knowledge_description: form.hasBasicKnowledge === 'yes' ? form.knowledgeDescription.trim() : '',
        program: form.program,
        program_name: currentProgram?.name ?? form.program,
        start_date: form.startDate,
        payment_plan: form.paymentPlan,
        estimated_fees: total,
        message: form.message.trim(),
        status: 'pending',
        source: 'admissions_portal',
        recaptchaToken,
      })
      setShowSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <StudentLayout contentClassName="max-w-6xl">
        <SuccessScreen data={form} onLogin={() => navigate({ to: '/login', search: { redirect: undefined } })} />
      </StudentLayout>
    )
  }

  return (
    <StudentLayout contentClassName="max-w-6xl">
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Start Your <span className="text-primary">Tech Journey</span>
          </h1>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
          <p className="text-muted-foreground">
            Fill out the form below to apply for your chosen program.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <Card className="border border-border rounded-2xl">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Personal Information</h3>
                      </div>
                      <Separator />

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Field label="Full Name" required error={errors.fullName}>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="John Doe" value={form.fullName} onChange={set('fullName')} disabled={loading} />
                            </div>
                          </Field>
                        </div>

                        <Field label="Email Address" required error={errors.email}>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="email"
                              className="pl-9"
                              placeholder="john@example.com"
                              value={form.email}
                              onChange={set('email')}
                              onBlur={() => saveDraft(1)}
                              disabled={loading}
                            />
                          </div>
                        </Field>

                        <Field label="Phone Number" required error={errors.phone}>
                          <PhoneNumberInput
                            value={form.phone}
                            onChange={(value) => {
                              setForm((p) => ({ ...p, phone: value }))
                              setErrors((p) => ({ ...p, phone: '' }))
                            }}
                            defaultCountry="KE"
                            placeholder="Enter phone number"
                            disabled={loading}
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Program Details</h3>
                      </div>
                      <Separator />

                      {programsLoading ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
                          <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          Loading programs...
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2">
                              <Field label="Select Program" required error={errors.program}>
                                <Select
                                  value={form.program}
                                  onChange={(value) => {
                                    setForm((p) => ({ ...p, program: value, startDate: '' }))
                                    setErrors((p) => ({ ...p, program: '' }))
                                  }}
                                  disabled={loading}
                                  placeholder="Choose a program"
                                  options={[
                                    ...programs.map((program) => ({
                                      value: program.slug,
                                      label: `${program.name}${program.price != null ? ` - KSh ${program.price.toLocaleString()}` : ''}${program.coming_soon ? ' (Coming soon)' : ''}`,
                                    })),
                                    { value: '__help_me__', label: "I don't know - help me choose" },
                                  ]}
                                />
                              </Field>
                            </div>

                            {form.program === '__help_me__' && (
                              <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold">No problem - our team will guide you</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Continue and tell us about your goals. We will match you to the right program.
                                  </p>
                                </div>
                              </div>
                            )}

                            {form.program !== '__help_me__' && !currentProgram?.coming_soon && !intakesLoading && availableModes.length > 0 && (
                              <div className="sm:col-span-2">
                                <Field label="Program Type" required error={errors.mode}>
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {availableModes.map((mode) => (
                                      <button
                                        key={mode.value}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => {
                                          setSelectedMode(mode.value)
                                          setErrors((p) => ({ ...p, mode: '', startDate: '' }))
                                        }}
                                        className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                                          selectedMode === mode.value
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                            {mode.intensity}
                                          </span>
                                          <span className="font-medium">{mode.format}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{mode.desc}</span>
                                      </button>
                                    ))}
                                  </div>
                                </Field>
                              </div>
                            )}

                            {form.program !== '__help_me__' && !currentProgram?.coming_soon && selectedMode && modeFilteredIntakes.length > 0 && (
                              <Field label="Preferred Start Date" required error={errors.startDate}>
                                <Select
                                  value={form.startDate}
                                  onChange={set('startDate')}
                                  disabled={loading || intakesLoading}
                                  placeholder={intakesLoading ? 'Loading dates...' : 'Select a start date'}
                                  options={modeFilteredIntakes.map((intake) => {
                                    const deadline = intake.application_deadline
                                      ? new Date(intake.application_deadline).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
                                      : null
                                    return {
                                      value: intake.start_date,
                                      label: `${fmtDate(intake.start_date)}${intake.seats_remaining != null ? ` - ${intake.seats_remaining} spots` : ''}${deadline ? ` - Apply by ${deadline}` : ''}`,
                                    }
                                  })}
                                />
                              </Field>
                            )}

                            {form.program && form.program !== '__help_me__' && !currentProgram?.coming_soon && !intakesLoading && intakes.length === 0 && (
                              <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-primary">No upcoming intakes scheduled</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    You can still apply - admissions will confirm your start date once a new cohort opens.
                                  </p>
                                </div>
                              </div>
                            )}

                            {form.program && form.program !== '__help_me__' && currentProgram?.coming_soon && (
                              <div className="sm:col-span-2">
                                <ComingSoonForm
                                  name={form.fullName}
                                  email={form.email}
                                  phone={form.phone}
                                  programSlug={form.program}
                                  programName={currentProgram.name}
                                  onDone={() => setShowSuccess(true)}
                                />
                              </div>
                            )}

                            {form.program && form.program !== '__help_me__' && !currentProgram?.coming_soon && (
                              <>
                                <div className="sm:col-span-2">
                                  <Field label="Do you have basic knowledge of the chosen program?" required error={errors.hasBasicKnowledge}>
                                    <div className="flex gap-3">
                                      {(['yes', 'no'] as const).map((value) => (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() => {
                                            setForm((p) => ({
                                              ...p,
                                              hasBasicKnowledge: value,
                                              knowledgeDescription: value === 'no' ? '' : p.knowledgeDescription,
                                            }))
                                            setErrors((p) => ({ ...p, hasBasicKnowledge: '', knowledgeDescription: '' }))
                                          }}
                                          className={`flex-1 h-10 rounded-xl border text-sm font-medium transition-colors ${
                                            form.hasBasicKnowledge === value
                                              ? 'border-primary bg-primary/5 text-primary'
                                              : 'border-border hover:border-primary/50'
                                          }`}
                                          disabled={loading}
                                        >
                                          {value === 'yes' ? 'Yes' : 'No'}
                                        </button>
                                      ))}
                                    </div>
                                  </Field>
                                </div>

                                {form.hasBasicKnowledge === 'yes' && (
                                  <div className="sm:col-span-2">
                                    <Field label="Please describe what basic knowledge you have" required error={errors.knowledgeDescription}>
                                      <Textarea
                                        rows={3}
                                        placeholder="e.g. I have done some HTML/CSS and basic Python"
                                        value={form.knowledgeDescription}
                                        onChange={set('knowledgeDescription')}
                                        disabled={loading}
                                      />
                                    </Field>
                                  </div>
                                )}

                                <Field label="Payment Plan" required>
                                  <Select
                                    value={form.paymentPlan}
                                    onChange={set('paymentPlan')}
                                    disabled={loading}
                                    options={PAYMENT_PLANS.map((plan) => ({ value: plan.id, label: `${plan.name} (${plan.note})` }))}
                                  />
                                </Field>
                              </>
                            )}
                          </div>

                          {selectedIntake?.application_deadline && (
                            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                              <div>
                                <p className="text-sm font-semibold text-warning">
                                  Application deadline: {fmtDate(selectedIntake.application_deadline)}
                                </p>
                                <p className="text-xs mt-0.5 text-muted-foreground">
                                  Submit early so admissions can review your application before the cohort closes.
                                </p>
                              </div>
                            </div>
                          )}

                          {base > 0 && form.program !== '__help_me__' && !currentProgram?.coming_soon && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Wallet className="w-4 h-4 text-primary" /> Estimated Program Fees
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {form.paymentPlan === 'full'
                                    ? 'One-time payment - no surcharge (best value)'
                                    : form.paymentPlan === 'installment3'
                                      ? 'Split into 3 equal instalments (20% surcharge)'
                                      : 'Split into 2 equal instalments (10% surcharge)'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">KSh {total.toLocaleString()}</p>
                                <div className="mt-3 text-sm text-muted-foreground space-y-0.5">
                                  {form.paymentPlan === 'full' && <p>One-time amount due</p>}
                                  {form.paymentPlan === 'installment2' && <p>KSh {inst2Per.toLocaleString()} per instalment x 2</p>}
                                  {form.paymentPlan === 'installment3' && <p>KSh {inst3Per.toLocaleString()} per instalment x 3</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">
                            {form.program === '__help_me__' ? 'Guidance Request Summary' : 'Application Summary'}
                          </h3>
                        </div>
                        <Separator />
                        <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border text-sm">
                          {[
                            { label: 'Name', value: form.fullName },
                            { label: 'Email', value: form.email },
                            { label: 'Phone', value: form.phone },
                            form.program === '__help_me__'
                              ? { label: 'Request', value: 'Program guidance - team will reach out' }
                              : { label: 'Program', value: currentProgram?.name ?? form.program },
                            ...(form.program !== '__help_me__' && selectedMode ? [{ label: 'Program Type', value: selectedModeLabel }] : []),
                            ...(form.program !== '__help_me__'
                              ? [
                                  { label: 'Start Date', value: form.startDate ? fmtDate(form.startDate) : 'TBD - admissions team will confirm' },
                                  ...(selectedIntake?.application_deadline ? [{ label: 'Apply by', value: fmtDate(selectedIntake.application_deadline) }] : []),
                                  { label: 'Payment Plan', value: PAYMENT_PLANS.find((plan) => plan.id === form.paymentPlan)?.name ?? form.paymentPlan },
                                  { label: 'Estimated Fees', value: `KSh ${total.toLocaleString()}` },
                                ]
                              : []),
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-medium text-right max-w-[60%]">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <PenLine className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">Additional Details</h3>
                        </div>
                        <Separator />
                        <Field label="Why do you want to join this program? (Optional)">
                          <Textarea
                            rows={4}
                            placeholder="Tell us about your goals and expectations..."
                            value={form.message}
                            onChange={set('message')}
                            disabled={loading}
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-3">
                    {step > 1 && (
                      <Button type="button" variant="outline" onClick={goPrev} disabled={loading} className="w-28">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </Button>
                    )}
                    {step < 3 ? (
                      <Button type="button" onClick={goNext} disabled={loading} className="flex-1">
                        Continue <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing Application...
                          </span>
                        ) : form.program === '__help_me__' ? (
                          'Request Guidance'
                        ) : (
                          'Submit Application'
                        )}
                      </Button>
                    )}
                  </div>

                  {step === 3 && (
                    <p className="text-center text-xs text-muted-foreground -mt-4">
                      By submitting, you agree to our{' '}
                      <a href="https://nexaacademy.co.ke/legal" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Terms
                      </a>{' '}
                      and{' '}
                      <a href="https://nexaacademy.co.ke/legal" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            <Card className="border border-border rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Admissions Timeline</h3>
                </div>
                <Separator />
                {DEFAULT_TIMELINE.map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center gap-3 text-sm rounded-lg bg-muted/30 px-3 py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <Badge variant="outline" className="border-primary text-primary text-xs">{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">Next Steps</h4>
                </div>
                <Separator />
                <ol className="space-y-3 text-sm text-muted-foreground">
                  {DEFAULT_NEXT_STEPS.map((item, i) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
