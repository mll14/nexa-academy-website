import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  User, Mail, Phone, BookOpen, CalendarDays, Wallet,
  ChevronRight, ChevronLeft, Check, CheckCircle2, ClipboardList, PenLine, AlertCircle,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select } from '../components/ui/select'
import { Card, CardContent } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { Badge } from '../components/ui/badge'
import * as api from '../lib/api'
import { calcFee } from '../lib/utils'
import toast from 'react-hot-toast'
import type { Program, Intake } from '../types'

const PAYMENT_PLANS = [
  { id: 'full', name: 'One-time Payment', note: 'Best discount' },
  { id: 'installment2', name: '2 Installments', note: '10% surcharge' },
  { id: 'installment3', name: '3 Installments', note: '20% surcharge' },
]

const STEPS = [{ label: 'About You' }, { label: 'Program & Plan' }, { label: 'Review & Submit' }]

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
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 rounded transition-all ${
                  done ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SuccessScreen({ data, onLogin }: { data: FormData; onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold">Application Submitted!</h1>
          <p className="text-muted-foreground">
            Thank you, <strong>{data.fullName}</strong>. We've received your application and will
            review it within 2 hours.
          </p>
        </div>
        <Card>
          <CardContent className="p-5 text-sm space-y-2">
            {[
              { label: 'Email', value: data.email },
              { label: 'Program', value: data.program },
              { label: 'Start Date', value: data.startDate ? new Date(data.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
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

export function Apply() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/apply' }) as { program?: string }

  const [programs, setPrograms] = useState<Program[]>([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [intakesLoading, setIntakesLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
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
      .then((data) => setPrograms(data.filter((p) => !p.coming_soon)))
      .catch(() => {})
      .finally(() => setProgramsLoading(false))
  }, [])

  const fetchIntakes = useCallback(
    async (programSlug: string) => {
      const prog = programs.find((p) => p.slug === programSlug)
      if (!prog) return
      setIntakesLoading(true)
      try {
        const all = await api.getIntakes({ program_name: prog.name, status: 'open' })
        setIntakes(all)
      } catch {
        setIntakes([])
      } finally {
        setIntakesLoading(false)
      }
    },
    [programs],
  )

  useEffect(() => {
    if (!form.program) { setIntakes([]); return }
    fetchIntakes(form.program)
  }, [form.program, fetchIntakes])

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | string) => {
    const val = typeof e === 'string' ? e : e.target.value
    setForm((p) => ({ ...p, [field]: val }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const saveDraft = async () => {
    if (!/\S+@\S+\.\S+/.test(form.email)) return
    try {
      await api.saveDraft({ email: form.email, full_name: form.fullName, program: form.program, step_reached: step })
    } catch { /* silent */ }
  }

  const validateStep1 = () => {
    const e: typeof errors = {}
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Full name required (min 2 chars)'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Phone number required'
    if (!form.hasBasicKnowledge) e.hasBasicKnowledge = 'Please select yes or no'
    if (!form.knowledgeDescription.trim()) e.knowledgeDescription = 'Please describe your background'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: typeof errors = {}
    if (!form.program) e.program = 'Please choose a program'
    // Only require a start date when open intakes are available to pick from
    if (!form.startDate && intakes.length > 0) e.startDate = 'Please choose a start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = async () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    await saveDraft()
    setStep((s) => Math.min(s + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goPrev = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const prog = programs.find((p) => p.slug === form.program)
    const estimatedFees = calcFee(prog?.price ?? 0, form.paymentPlan)
    setLoading(true)
    try {
      await api.submitApplication({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        has_basic_knowledge: form.hasBasicKnowledge === 'yes',
        knowledge_description: form.knowledgeDescription.trim(),
        program: form.program,
        program_name: prog?.name ?? form.program,
        start_date: form.startDate,
        payment_plan: form.paymentPlan,
        estimated_fees: estimatedFees,
        message: form.message.trim(),
        status: 'pending',
      })
      setShowSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (showSuccess) {
    return <SuccessScreen data={form} onLogin={() => navigate({ to: '/login' })} />
  }

  const prog = programs.find((p) => p.slug === form.program)
  const base = prog?.price ?? 0
  const total = calcFee(base, form.paymentPlan)
  const inst2Per = Math.round((base * 1.1) / 2 / 500) * 500
  const inst3Per = Math.round((base * 1.2) / 3 / 500) * 500
  const planNote = form.paymentPlan === 'full' ? 'One-time, no surcharge'
    : form.paymentPlan === 'installment3' ? '3 equal instalments (20% surcharge)'
    : '2 equal instalments (10% surcharge)'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 h-14 flex items-center">
        <span className="font-heading font-bold text-primary text-lg">Nexa Academy</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">
            Start Your <span className="text-primary">Tech Journey</span>
          </h1>
          <p className="text-muted-foreground">Fill out the form below to apply for a program.</p>
        </div>

        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form */}
          <div className="lg:col-span-8">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Personal Information</h3>
                      </div>
                      <Separator />
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label>Full Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="John Doe" value={form.fullName} onChange={set('fullName')} disabled={loading} />
                          </div>
                          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email Address *</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" className="pl-9" placeholder="john@example.com" value={form.email} onChange={set('email')} onBlur={saveDraft} disabled={loading} />
                          </div>
                          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Phone Number *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="+254 700 000 000" value={form.phone} onChange={set('phone')} disabled={loading} />
                          </div>
                          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label>Do you have basic knowledge of the chosen program? *</Label>
                          <Select
                            value={form.hasBasicKnowledge}
                            onChange={(v) => set('hasBasicKnowledge')(v)}
                            disabled={loading}
                            options={[
                              { value: '', label: 'Choose yes or no' },
                              { value: 'yes', label: 'Yes' },
                              { value: 'no', label: 'No' },
                            ]}
                          />
                          {errors.hasBasicKnowledge && <p className="text-xs text-destructive">{errors.hasBasicKnowledge}</p>}
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label>Please describe your background *</Label>
                          <Textarea rows={4} placeholder="Briefly describe what you know or your experience" value={form.knowledgeDescription} onChange={set('knowledgeDescription')} disabled={!form.hasBasicKnowledge || loading} />
                          {errors.knowledgeDescription && <p className="text-xs text-destructive">{errors.knowledgeDescription}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
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
                          Loading programs…
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label>Select Program *</Label>
                            <Select
                              value={form.program}
                              onChange={(v) => set('program')(v)}
                              disabled={loading}
                              options={[
                                { value: '', label: 'Choose a program' },
                                ...programs.map((p) => ({
                                  value: p.slug,
                                  label: `${p.name} — KSh ${p.price != null ? p.price.toLocaleString() : 'TBA'}`,
                                })),
                              ]}
                            />
                            {errors.program && <p className="text-xs text-destructive">{errors.program}</p>}
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>Preferred Start Date {intakes.length > 0 ? '*' : ''}</Label>
                              {!intakesLoading && form.program && intakes.length === 0 ? (
                                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                                  <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <p className="text-xs text-muted-foreground">No open intakes — admissions will confirm the start date after reviewing your application.</p>
                                </div>
                              ) : (
                                <Select
                                  value={form.startDate}
                                  onChange={(v) => set('startDate')(v)}
                                  disabled={loading || intakesLoading || !form.program}
                                  placeholder={!form.program ? 'Choose a program first' : intakesLoading ? 'Loading…' : 'Select a date'}
                                  options={intakes.map((intake) => ({
                                    value: intake.start_date,
                                    label: `${new Date(intake.start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}${intake.seats_remaining != null ? ` (${intake.seats_remaining} seats)` : ''}`,
                                  }))}
                                />
                              )}
                              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label>Payment Plan</Label>
                              <Select
                                value={form.paymentPlan}
                                onChange={(v) => set('paymentPlan')(v)}
                                disabled={loading}
                                options={PAYMENT_PLANS.map((p) => ({ value: p.id, label: `${p.name} (${p.note})` }))}
                              />
                            </div>
                          </div>

                          {form.program && base > 0 && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Wallet className="w-4 h-4 text-primary" /> Estimated Program Fees
                                </div>
                                <p className="text-xs text-muted-foreground">{planNote}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">KSh {total.toLocaleString()}</p>
                                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                  {form.paymentPlan === 'installment2' && <p>KSh {inst2Per.toLocaleString()} × 2</p>}
                                  {form.paymentPlan === 'installment3' && <p>KSh {inst3Per.toLocaleString()} × 3</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Application Summary</h3>
                      </div>
                      <Separator />
                      <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border text-sm">
                        {[
                          { label: 'Name', value: form.fullName },
                          { label: 'Email', value: form.email },
                          { label: 'Phone', value: form.phone },
                          { label: 'Program', value: prog?.name ?? form.program },
                          { label: 'Start Date', value: form.startDate ? new Date(form.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD — admissions will confirm' },
                          { label: 'Payment Plan', value: PAYMENT_PLANS.find((p) => p.id === form.paymentPlan)?.name ?? form.paymentPlan },
                          { label: 'Estimated Fees', value: `KSh ${total.toLocaleString()}` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between px-4 py-2.5">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium text-right max-w-[60%]">{value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <PenLine className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">Additional Details</h3>
                        </div>
                        <Separator />
                        <div className="space-y-1.5">
                          <Label>Why do you want to join this program? (Optional)</Label>
                          <Textarea rows={4} placeholder="Tell us about your goals…" value={form.message} onChange={set('message')} disabled={loading} />
                        </div>
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
                            Submitting…
                          </span>
                        ) : (
                          'Submit Application'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Admissions Timeline</h3>
                </div>
                <Separator />
                {[
                  { label: 'Application review', value: 'Under 2 hours' },
                  { label: 'Admissions follow-up', value: 'Under 24 hours' },
                  { label: 'Final enrollment', value: '24–48 hours' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-sm rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-muted-foreground">{label}</span>
                    <Badge variant="outline" className="border-primary text-primary text-xs">{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm">Why Nexa?</h3>
                <Separator />
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {['Free dedicated application guidance', 'Clear payment plans and support', 'Program roadmap from industry mentors', 'Fast admissions process'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Next Steps</h4>
                </div>
                <Separator />
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  {['Admissions team reviews your goals', 'Optional orientation call', 'Final onboarding into the cohort'].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
