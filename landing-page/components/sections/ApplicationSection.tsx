'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import {
  User,
  Mail,
  Phone,
  BookOpen,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  PenLine,
  Wallet,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { Field } from '@/components/application/Field'
import { SuccessScreen } from '@/components/application/SuccessScreen'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import { submitApplication, saveDraft, getClientPrograms, getClientIntakes } from '@/lib/api/applications'
import type { ApplicationSection as ApplicationSectionType } from '@/types'

// ── types ──────────────────────────────────────────────────────────────────────
interface ApiProgram {
  id: string | number
  slug: string
  title: string
  price: number | null
  duration_months?: number
  durationMonths?: number
}

interface ApiIntake {
  id: string
  start_date: string
  seats_remaining: number | null
  status: string
}

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

// ── constants ──────────────────────────────────────────────────────────────────
const PAYMENT_PLANS = [
  { id: 'full', name: 'One-time Payment', note: 'Best discount' },
  { id: 'installment2', name: '2 Installments', note: '+10% surcharge' },
  { id: 'installment3', name: '3 Installments', note: '+20% surcharge' },
]

const STEPS = [
  { label: 'Personal', icon: User },
  { label: 'Program', icon: BookOpen },
  { label: 'Review', icon: ClipboardList },
]

const INITIAL_FORM: FormData = {
  fullName: '',
  email: '',
  phone: '',
  hasBasicKnowledge: '',
  knowledgeDescription: '',
  program: '',
  startDate: '',
  paymentPlan: 'full',
  message: '',
}

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function calcFees(base: number, plan: string): number {
  if (plan === 'installment2') return Math.round((base * 1.1) / 2 / 500) * 500 * 2
  if (plan === 'installment3') return Math.round((base * 1.2) / 3 / 500) * 500 * 3
  return base
}

// ── sub-components ─────────────────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const num = i + 1
          const done = num < currentStep
          const active = num === currentStep
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                    done
                      ? 'bg-primary border-primary text-white'
                      : active
                        ? 'border-primary text-primary bg-white'
                        : 'border-border text-muted-foreground bg-white'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : num}
                </div>
                <span className={`text-[11px] mt-1 font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mb-4 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export function ApplicationSection({ section }: { section: ApplicationSectionType }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [programs, setPrograms] = useState<ApiProgram[]>([])
  const [intakes, setIntakes] = useState<ApiIntake[]>([])
  const [intakesLoading, setIntakesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [applicationData, setApplicationData] = useState<Record<string, unknown> | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // load programs
  useEffect(() => {
    getClientPrograms().then((list) => {
      setPrograms(list as ApiProgram[])
    })
  }, [])

  // load intakes when program changes
  const fetchIntakes = useCallback(async (programId: string) => {
    if (!programId) { setIntakes([]); return }
    setIntakesLoading(true)
    const data = await getClientIntakes(programId)
    setIntakes(data as ApiIntake[])
    setIntakesLoading(false)
  }, [])

  useEffect(() => {
    const prog = programs.find((p) => String(p.id) === formData.program || p.slug === formData.program)
    fetchIntakes(prog ? String(prog.id) : '')
  }, [formData.program, programs, fetchIntakes])

  // clear invalid start date when intakes change
  useEffect(() => {
    const valid = intakes.map((i) => i.start_date)
    if (formData.startDate && !valid.includes(formData.startDate)) {
      setFormData((p) => ({ ...p, startDate: '' }))
    }
  }, [intakes]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof FormData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const handleEmailBlur = () => {
    if (/\S+@\S+\.\S+/.test(formData.email.trim())) {
      saveDraft({ email: formData.email.trim(), full_name: formData.fullName, program: formData.program, step_reached: 1 })
    }
  }

  // ── validation ──
  const validateStep1 = () => {
    const e: typeof errors = {}
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) e.fullName = 'Full name is required (min 2 chars)'
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) e.email = 'A valid email is required'
    if (!formData.phone || !isValidPhoneNumber(formData.phone)) e.phone = 'A valid phone number is required'
    if (!formData.hasBasicKnowledge) e.hasBasicKnowledge = 'Please indicate your knowledge level'
    if (!formData.knowledgeDescription?.trim()) e.knowledgeDescription = 'Please describe what you know (required)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: typeof errors = {}
    if (!formData.program) e.program = 'Please choose a program'
    if (!formData.startDate) e.startDate = 'Please choose a start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goToNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return
      saveDraft({ email: formData.email.trim(), full_name: formData.fullName, program: formData.program, step_reached: 2 })
    } else if (step === 2) {
      if (!validateStep2()) return
      saveDraft({ email: formData.email.trim(), full_name: formData.fullName, program: formData.program, step_reached: 3 })
    }
    setStep((s) => Math.min(s + 1, 3))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const goToPrev = () => {
    setStep((s) => Math.max(s - 1, 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── submit ──
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const prog = programs.find((p) => String(p.id) === formData.program || p.slug === formData.program)
      const base = prog?.price ?? 0
      const estimatedFees = calcFees(base, formData.paymentPlan)

      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        phone_country: '',
        has_basic_knowledge: formData.hasBasicKnowledge === 'yes',
        knowledge_description: formData.knowledgeDescription.trim(),
        program: formData.program,
        program_name: prog?.title ?? 'Unknown Program',
        start_date: formData.startDate,
        payment_plan: formData.paymentPlan,
        estimated_fees: estimatedFees,
        message: formData.message?.trim() ?? '',
        status: 'pending',
        source: 'website',
      }

      const result = await submitApplication(payload)
      if (result.success) {
        setApplicationData({ ...payload, id: result.id })
        setShowSuccess(true)
      } else {
        throw new Error(result.error ?? 'Failed to submit')
      }
    } catch (err) {
      alert(`Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // ── fee display helpers ──
  const prog = programs.find((p) => String(p.id) === formData.program || p.slug === formData.program)
  const basePrice = prog?.price ?? 0
  const inst2Per = Math.round((basePrice * 1.1) / 2 / 500) * 500
  const inst2Total = inst2Per * 2
  const inst3Per = Math.round((basePrice * 1.2) / 3 / 500) * 500
  const inst3Total = inst3Per * 3
  const estimatedFees = calcFees(basePrice, formData.paymentPlan)

  const financeSummary =
    formData.paymentPlan === 'full'
      ? { total: basePrice, per: basePrice, count: 1, label: 'One-time payment', savings: inst3Total - basePrice, savingsLabel: 'vs 3-instalment plan' }
      : formData.paymentPlan === 'installment3'
        ? { total: inst3Total, per: inst3Per, count: 3, label: '3 instalments', savings: 0, savingsLabel: '' }
        : { total: inst2Total, per: inst2Per, count: 2, label: '2 instalments', savings: inst3Total - inst2Total, savingsLabel: 'vs 3-instalment plan' }

  const planNote =
    formData.paymentPlan === 'full'
      ? 'One-time payment — no surcharge (best value)'
      : formData.paymentPlan === 'installment3'
        ? 'Split into 3 equal instalments (20% surcharge)'
        : 'Split into 2 equal instalments (10% surcharge)'

  // ── success screen ──
  if (showSuccess) {
    return (
      <SectionWrapper section={section}>
        <SuccessScreen
          data={applicationData as { full_name?: string; email?: string; program_name?: string } | null}
          onHome={() => window.location.href = '/'}
          onContact={() => window.location.href = '/contact'}
        />
      </SectionWrapper>
    )
  }

  // ── form ──
  return (
    <SectionWrapper section={section}>
      <div ref={topRef} className="max-w-5xl mx-auto px-4">
        {/* heading */}
        <div className="text-center mb-8 space-y-2">
          <Badge variant="primary">{section.badge ?? 'Apply Now'}</Badge>
          <h1 className="font-semibold text-3xl sm:text-4xl">{section.headline ?? 'Start Your Application'}</h1>
          {section.subheadline && <p className="text-muted-foreground max-w-xl mx-auto">{section.subheadline}</p>}
        </div>

        <StepIndicator currentStep={step} />

        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* ── FORM CARD ── */}
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-6">

              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h2 className="font-semibold">Personal Information</h2>
                  </div>

                  <Field label="Full Name" required error={errors.fullName}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Jane Doe"
                        value={formData.fullName}
                        onChange={(e) => set('fullName', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </Field>

                  <Field label="Email Address" required error={errors.email}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="jane@example.com"
                        value={formData.email}
                        onChange={(e) => set('email', e.target.value)}
                        onBlur={handleEmailBlur}
                        className="pl-10"
                      />
                    </div>
                  </Field>

                  <Field label="Phone Number" required error={errors.phone}>
                    <PhoneInput
                      international
                      defaultCountry="KE"
                      value={formData.phone}
                      onChange={(v) => set('phone', v ?? '')}
                      className="phone-input-wrapper"
                    />
                  </Field>

                  <Field label="Do you have basic knowledge of this field?" required error={errors.hasBasicKnowledge}>
                    <div className="grid grid-cols-2 gap-3">
                      {['yes', 'no'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => set('hasBasicKnowledge', val)}
                          className={`h-11 rounded-lg border text-sm font-medium transition-colors capitalize ${
                            formData.hasBasicKnowledge === val
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {val === 'yes' ? 'Yes, I do' : 'No, I\'m new'}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Describe your current knowledge or experience" required error={errors.knowledgeDescription}>
                    <Textarea
                      placeholder="Tell us what you know about this field, any projects you've worked on, or what excites you about it…"
                      value={formData.knowledgeDescription}
                      onChange={(e) => set('knowledgeDescription', e.target.value)}
                      rows={4}
                    />
                  </Field>
                </div>
              )}

              {/* STEP 2: Program & Payment */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h2 className="font-semibold">Program & Schedule</h2>
                  </div>

                  <Field label="Program" required error={errors.program}>
                    <select
                      value={formData.program}
                      onChange={(e) => set('program', e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                    >
                      <option value="">Select a program…</option>
                      {programs.map((p) => (
                        <option key={String(p.id)} value={String(p.id)}>
                          {p.title}{p.price ? ` — KSh ${Number(p.price).toLocaleString()}` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Start Date" required error={errors.startDate}>
                    {intakesLoading ? (
                      <div className="h-11 rounded-lg bg-muted animate-pulse" />
                    ) : intakes.length === 0 ? (
                      <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-border text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        {formData.program ? 'No open intakes available' : 'Select a program first'}
                      </div>
                    ) : (
                      <select
                        value={formData.startDate}
                        onChange={(e) => set('startDate', e.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                      >
                        <option value="">Choose a start date…</option>
                        {intakes.map((i) => (
                          <option key={i.id} value={i.start_date}>
                            {fmtDate(i.start_date)}
                            {i.seats_remaining != null ? ` (${i.seats_remaining} seats left)` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Plan</label>
                    <div className="grid gap-2">
                      {PAYMENT_PLANS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => set('paymentPlan', p.id)}
                          className={`flex items-center justify-between h-12 px-4 rounded-lg border text-sm font-medium transition-colors ${
                            formData.paymentPlan === p.id
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          <span>{p.name}</span>
                          <span className={`text-xs ${formData.paymentPlan === p.id ? 'text-primary/70' : 'text-muted-foreground'}`}>{p.note}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Additional Message (optional)">
                    <Textarea
                      placeholder="Anything else you'd like us to know?"
                      value={formData.message}
                      onChange={(e) => set('message', e.target.value)}
                      rows={3}
                    />
                  </Field>
                </div>
              )}

              {/* STEP 3: Review */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h2 className="font-semibold">Review Your Application</h2>
                  </div>

                  {/* Personal section */}
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Personal
                      </p>
                      <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <PenLine className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <Separator />
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Name</dt><dd className="font-medium">{formData.fullName}</dd>
                      <dt className="text-muted-foreground">Email</dt><dd className="font-medium">{formData.email}</dd>
                      <dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{formData.phone}</dd>
                      <dt className="text-muted-foreground">Experience</dt>
                      <dd className="font-medium">{formData.hasBasicKnowledge === 'yes' ? 'Has prior knowledge' : 'New to the field'}</dd>
                    </dl>
                  </div>

                  {/* Program section */}
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Program
                      </p>
                      <button onClick={() => setStep(2)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <PenLine className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <Separator />
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Program</dt>
                      <dd className="font-medium">{prog?.title ?? formData.program}</dd>
                      <dt className="text-muted-foreground">Start Date</dt>
                      <dd className="font-medium flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-primary" />{fmtDate(formData.startDate)}</dd>
                      <dt className="text-muted-foreground">Payment</dt>
                      <dd className="font-medium">{PAYMENT_PLANS.find((p) => p.id === formData.paymentPlan)?.name}</dd>
                    </dl>
                  </div>

                  {/* Fee summary */}
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Fee Summary
                    </p>
                    <Separator />
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Plan</dt>
                        <dd className="font-medium">{financeSummary.label}</dd>
                      </div>
                      {financeSummary.count > 1 && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Per instalment</dt>
                          <dd className="font-medium">KSh {financeSummary.per.toLocaleString()}</dd>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <dt>Total</dt>
                        <dd className="text-primary text-base">KSh {estimatedFees.toLocaleString()}</dd>
                      </div>
                      {financeSummary.savings > 0 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Saving KSh {financeSummary.savings.toLocaleString()} {financeSummary.savingsLabel}
                        </p>
                      )}
                    </dl>
                    <p className="text-[11px] text-muted-foreground">{planNote}</p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    By submitting you agree to our terms of service and privacy policy. We'll contact you within 24 hours.
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                {step > 1 ? (
                  <button
                    onClick={goToPrev}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button
                    onClick={goToNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:pointer-events-none transition-colors"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Submit Application</>
                    )}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── SIDEBAR ── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Process steps */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-sm">Application Process</h3>
                <Separator />
                <ol className="space-y-3">
                  {[
                    { icon: PenLine, title: 'Complete Form', desc: 'Fill in your details in 3 quick steps' },
                    { icon: CheckCircle2, title: 'Review & Submit', desc: 'Double-check everything, then submit' },
                    { icon: Mail, title: 'Confirmation Email', desc: 'Get instant confirmation in your inbox' },
                    { icon: CalendarDays, title: 'Interview Invite', desc: 'Admissions team schedules a short call' },
                    { icon: BookOpen, title: 'Enrolment', desc: 'Complete payment and get access' },
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${i < step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        {i < 4 && <div className="w-0.5 h-4 bg-border mt-1" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Next steps */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Why Nexa Academy?
                </h3>
                <Separator />
                <ul className="space-y-2">
                  {[
                    'Live weekly mentor sessions',
                    'Industry-recognised certificate',
                    'Job placement support',
                    'Access to alumni network',
                    'Portfolio-grade projects',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Selected program fees */}
            {prog && basePrice > 0 && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> Fee Estimate
                  </h3>
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">One-time</span>
                      <span className="font-medium">KSh {basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">2 instalments</span>
                      <span className="font-medium">KSh {inst2Per.toLocaleString()} × 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">3 instalments</span>
                      <span className="font-medium">KSh {inst3Per.toLocaleString()} × 3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
