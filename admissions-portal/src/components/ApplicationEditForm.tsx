import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save, User } from 'lucide-react'
import * as api from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, type SelectOptionItem } from './ui/select'
import { PhoneNumberInput } from './ui/phone-input'
import { Separator } from './ui/separator'
import { isValidPhoneNumber } from 'react-phone-number-input'
import toast from 'react-hot-toast'
import type { Application, Intake, Program } from '../types'

type ProgramOption = Pick<Program, 'slug' | 'name' | 'coming_soon'>

const PAYMENT_PLAN_OPTIONS = [
  { value: 'full', label: 'One-time Payment' },
  { value: 'installment2', label: '2 Instalments' },
  { value: 'installment3', label: '3 Instalments' },
]

function paymentPlanToValue(value?: string) {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized.includes('3')) return 'installment3'
  if (normalized.includes('2')) return 'installment2'
  return 'full'
}

function formatIntakeLabel(intake: Intake) {
  const deadline = intake.application_deadline
    ? new Date(intake.application_deadline).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
    : null
  return `${new Date(intake.start_date).toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}${intake.seats_remaining != null ? ` · ${intake.seats_remaining} spots` : ''}${deadline ? ` · Apply by ${deadline}` : ''}`
}

export function ApplicationEditForm({
  application,
  onSaved,
  showHeader = true,
}: {
  application: Application
  onSaved?: (updated: Application) => void
  showHeader?: boolean
}) {
  const [form, setForm] = useState({
    fullName: application.full_name ?? '',
    email: application.email ?? '',
    phone: application.phone ?? '',
    program: application.program ?? '',
    startDate: application.start_date ?? '',
    paymentPlan: paymentPlanToValue(application.payment_plan),
  })

  useEffect(() => {
    setForm({
      fullName: application.full_name ?? '',
      email: application.email ?? '',
      phone: application.phone ?? '',
      program: application.program ?? '',
      startDate: application.start_date ?? '',
      paymentPlan: paymentPlanToValue(application.payment_plan),
    })
  }, [application])

  const { data: activePrograms = [] } = useQuery<Program[]>({
    queryKey: ['application-edit', 'programs'],
    queryFn: () => api.getPrograms({ status: 'active', ordering: 'name' }),
  })

  const needsProgramFallback = !!application.program && application.program !== '__help_me__'
    && !activePrograms.some((program) => program.slug === application.program)

  const { data: fallbackProgram } = useQuery({
    queryKey: ['application-edit', 'program', application.program],
    queryFn: () => api.getProgramBySlug(application.program),
    enabled: needsProgramFallback,
  })

  const programOptions = useMemo<ProgramOption[]>(() => {
    const list: ProgramOption[] = activePrograms.map((program) => ({
      slug: program.slug,
      name: program.name,
      coming_soon: program.coming_soon,
    }))
    if (fallbackProgram && !list.some((program) => program.slug === fallbackProgram.slug)) {
      list.push(fallbackProgram)
    }
    if (application.program && application.program !== '__help_me__' && !list.some((program) => program.slug === application.program)) {
      list.push({
        slug: application.program,
        name: application.program_name || application.program,
        coming_soon: false,
      })
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [activePrograms, application.program, application.program_name, fallbackProgram])

  const selectedProgram = programOptions.find((program) => program.slug === form.program) ?? null

  const { data: intakes = [] } = useQuery<Intake[]>({
    queryKey: ['application-edit', 'intakes', selectedProgram?.slug],
    queryFn: () => api.getIntakes({ program_slug: selectedProgram?.slug, ordering: 'start_date' }),
    enabled: !!selectedProgram && selectedProgram.slug !== '__help_me__',
    select: (data) => {
      const list = Array.isArray(data) ? data : (data as { results?: Intake[] }).results ?? []
      return list.filter((intake) => intake.status === 'open')
    },
  })

  const intakeOptions = useMemo<SelectOptionItem[]>(() => {
    const options: SelectOptionItem[] = intakes.map((intake) => ({
      value: intake.start_date,
      label: formatIntakeLabel(intake),
    }))

    if (form.startDate && !options.some((option) => option.value === form.startDate)) {
      options.unshift({
        value: form.startDate,
        label: `${new Date(form.startDate).toLocaleDateString('en-KE', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })} · current intake`,
        disabled: true,
      })
    }

    return options
  }, [form.startDate, intakes])

  const saveMutation = useMutation({
    mutationFn: () => api.updateApplicationDetails(application.id, {
      full_name: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      program: form.program,
      program_name: selectedProgram?.name || application.program_name || form.program,
      payment_plan: form.paymentPlan,
      start_date: form.startDate || null,
    }),
    onSuccess: (updated) => {
      toast.success('Application details updated')
      onSaved?.(updated)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const hasIntakeChoices = !!selectedProgram && selectedProgram.slug !== '__help_me__' && intakes.length > 0
  const isValidPhone = !form.phone || isValidPhoneNumber(form.phone)
  const canSave = !!form.fullName.trim()
    && !!form.email.trim()
    && !!form.phone.trim()
    && !!form.program
    && isValidPhone
    && (!hasIntakeChoices || !!form.startDate)

  return (
    <div className="space-y-4">
      {showHeader && (
        <>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Edit application details</h2>
          </div>
          <Separator />
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="name@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone number</Label>
          <PhoneNumberInput
            value={form.phone}
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            placeholder="Phone number"
          />
          {form.phone && !isValidPhone && <p className="text-xs text-destructive">Enter a valid phone number.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Program</Label>
          <Select
            value={form.program}
            onChange={(value) => setForm((prev) => ({ ...prev, program: value, startDate: '' }))}
            placeholder="Select a program"
            options={programOptions.map((program) => ({
              value: program.slug,
              label: `${program.name}${program.coming_soon ? ' (Coming soon)' : ''}`,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Intake date</Label>
          <Select
            value={form.startDate}
            onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
            placeholder={selectedProgram?.slug === '__help_me__'
              ? 'No intake required'
              : intakes.length > 0
                ? 'Select an intake'
                : 'No intakes found'}
            disabled={!selectedProgram || selectedProgram.slug === '__help_me__'}
            options={intakeOptions}
          />
          {selectedProgram && selectedProgram.slug !== '__help_me__' && intakes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No open intakes are available for this program right now.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Installment plan</Label>
          <Select
            value={form.paymentPlan}
            onChange={(value) => setForm((prev) => ({ ...prev, paymentPlan: value }))}
            placeholder="Select a payment plan"
            options={PAYMENT_PLAN_OPTIONS}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          Changes update the linked student profile when the application is tied to an account.
        </p>
        <Button
          className="gap-2"
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
