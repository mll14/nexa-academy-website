import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Bell, BookOpen, Calendar, ChevronRight, FileWarning,
  Flame, HelpCircle, Mail, MessageSquare, Phone, PhoneCall, Send, User,
  CheckCircle2, Clock, Tag, PhoneOff, CalendarPlus,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { FollowUpForm } from '../../components/FollowUpForm'
import { AdminNotesPanel } from '../../components/admin/AdminNotesPanel'
import { CreateAppointmentDialog } from './Appointments'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import type { HelpMeLead, IncompleteApplication, LeadStatus, ProgramInterest } from '../../types'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

type LeadRouteType = 'interests' | 'help-me' | 'incomplete'
type LeadRecord = ProgramInterest | HelpMeLead | IncompleteApplication
type LeadTab = 'details' | 'notes'

const STEP_LABELS: Record<number, string> = { 1: 'About You', 2: 'Program & Plan', 3: 'Review' }

const LEAD_STATUS_OPTIONS: {
  value: LeadStatus
  label: string
  icon: React.ElementType
  className: string
}[] = [
  { value: 'new', label: 'New', icon: Clock, className: 'bg-muted text-muted-foreground border-border' },
  { value: 'contacted', label: 'Contacted', icon: Phone, className: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'not_reached', label: 'Not Responding', icon: PhoneOff, className: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
]

const LEAD_STATUS_SELECT_OPTIONS = LEAD_STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))

function leadStatus(item: { lead_status?: LeadStatus; follow_up_completed: boolean }): LeadStatus {
  return item.lead_status ?? (item.follow_up_completed ? 'completed' : 'new')
}

function leadStatusMeta(status: LeadStatus) {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status) ?? LEAD_STATUS_OPTIONS[0]
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = leadStatusMeta(status)
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${meta.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  )
}

function isLeadRouteType(value: string): value is LeadRouteType {
  return value === 'interests' || value === 'help-me' || value === 'incomplete'
}

function whatsappUrl(phone?: string) {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  return `https://wa.me/${digits}`
}

function SectionCard({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span className="text-primary">{icon}</span>
          <h2 className="font-heading font-semibold text-sm">{title}</h2>
        </div>
        <Separator />
        <div className="px-5 pb-5">{children}</div>
      </CardContent>
    </Card>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-all">{value}</span>
      </div>
    </div>
  )
}

function NotifyForm({
  programSlug, programName, ids, onDone,
}: {
  programSlug: string
  programName: string
  ids?: string[]
  onDone: () => void
}) {
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.notifyProgramInterests({
      program_slug: programSlug || undefined,
      program_name: programName || undefined,
      start_date: startDate,
      deadline: deadline || undefined,
      ids: ids?.length ? ids : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Sent ${res.sent} notification${res.sent !== 1 ? 's' : ''}${res.failed ? ` (${res.failed} failed)` : ''}`)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send notifications'),
  })

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
        <Bell className="w-3.5 h-3.5" /> Notify of Intake Opening
      </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Cohort start date *</Label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Application deadline</Label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={!startDate || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Bell className="w-3.5 h-3.5 mr-1.5" />
        {mutation.isPending ? 'Sending...' : 'Send Notification'}
      </Button>
    </div>
  )
}

function leadMeta(type: LeadRouteType, lead?: LeadRecord) {
  if (type === 'interests') {
    const item = lead as ProgramInterest | undefined
    return {
      title: item?.name || 'Interest Submission',
      subtitle: item?.email ?? '',
      badge: 'Coming Soon Interest',
      icon: Flame,
      noteType: 'program_interest' as const,
      stage: `Coming Soon Interest${item?.program_name ? ` · ${item.program_name}` : ''}`,
      defaultSubject: `Re: Your Interest in ${item?.program_name || item?.program_slug || 'Nexa Academy'} | Nexa Academy`,
    }
  }
  if (type === 'help-me') {
    const item = lead as HelpMeLead | undefined
    return {
      title: item?.name || 'Guidance Request',
      subtitle: item?.email ?? '',
      badge: 'Help Me Choose',
      icon: HelpCircle,
      noteType: 'help_me' as const,
      stage: 'Help Me Choose',
      defaultSubject: 'Re: Your Nexa Academy Program Inquiry',
    }
  }
  const item = lead as IncompleteApplication | undefined
  return {
    title: item?.name || 'Incomplete Application',
    subtitle: item?.email ?? '',
    badge: item ? `Left at: ${STEP_LABELS[item.step_reached] ?? `Step ${item.step_reached}`}` : 'Incomplete Form',
    icon: FileWarning,
    noteType: 'incomplete_application' as const,
    stage: item ? STEP_LABELS[item.step_reached] ?? `Step ${item.step_reached}` : 'Incomplete Form',
    defaultSubject: `Following up on your ${item?.program_name || 'Nexa Academy'} application`,
  }
}

export function LeadDetail() {
  const { leadType, id } = useParams({ from: '/admin/leads/$leadType/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const [tab, setTab] = useState<LeadTab>('details')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [showAppointment, setShowAppointment] = useState(false)
  const [pipelineProgramSlug, setPipelineProgramSlug] = useState('')

  const validType = isLeadRouteType(leadType) ? leadType : null
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['admin', 'lead', validType, id],
    enabled: !!validType,
    queryFn: async (): Promise<LeadRecord> => {
      if (validType === 'interests') return api.getProgramInterest(id)
      if (validType === 'help-me') return api.getHelpMeLead(id)
      if (validType === 'incomplete') return api.getIncompleteApplication(id)
      throw new Error('Invalid lead type')
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => api.updateLeadStatus(validType!, id, status),
    onSuccess: (_, status) => {
      toast.success(`Lead tagged as ${leadStatusMeta(status).label}`)
      qc.invalidateQueries({ queryKey: ['admin', 'lead', validType, id] })
      qc.invalidateQueries({ queryKey: ['admin', validType === 'interests' ? 'interests' : validType === 'help-me' ? 'help-me' : 'incomplete'] })
    },
    onError: () => toast.error('Could not update lead tag'),
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => api.getPrograms(),
    enabled: validType === 'help-me',
    staleTime: 5 * 60 * 1000,
  })

  const pipelineMutation = useMutation({
    mutationFn: ({ slug, name }: { slug: string; name: string }) =>
      api.convertHelpMeToPipeline(id, slug, name),
    onSuccess: (_, { name }) => {
      toast.success(`Pipeline email sent for ${name}`)
      setPipelineProgramSlug('')
      qc.invalidateQueries({ queryKey: ['admin', 'lead', validType, id] })
      qc.invalidateQueries({ queryKey: ['admin', 'help-me'] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send pipeline email'),
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !validType || !lead) {
    return (
      <AdminLayout>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-destructive font-medium">Lead not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/admin/leads', search: { tab: undefined } })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Leads
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const meta = leadMeta(validType, lead)
  const Icon = meta.icon
  const phone = 'phone' in lead ? lead.phone : ''
  const programName = 'program_name' in lead ? lead.program_name : ''
  const programSlug = 'program_slug' in lead ? lead.program_slug : ''
  const message = 'message' in lead ? lead.message : ''
  const createdAt = 'created_at' in lead ? lead.created_at : ''
  const updatedAt = 'updated_at' in lead ? lead.updated_at : ''
  const currentLeadStatus = leadStatus(lead)
  const helpMeLead = validType === 'help-me' ? lead as HelpMeLead : null
  const canCreateAppointment = hasPermission('appointments.manage')
  const selectedPipelineProgramSlug = pipelineProgramSlug || helpMeLead?.assigned_program_slug || ''
  const appointmentReason = [
    `Lead follow-up: ${meta.badge}`,
    programName || programSlug ? `Program: ${programName || programSlug}` : '',
    message ? `Notes: ${message}` : '',
  ].filter(Boolean).join('\n')
  const programOptions = [
    { value: '', label: 'Select a program...' },
    ...programs
      .filter((p) => !p.coming_soon)
      .map((p) => ({ value: p.slug, label: p.name })),
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate({ to: '/admin/leads', search: { tab: undefined } })}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold">{meta.title}</h1>
                <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold border bg-primary/10 text-primary border-primary/20">
              {meta.badge}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex border-b border-border">
              {([
                { id: 'details', label: 'Details', icon: User },
                { id: 'notes', label: 'Notes', icon: MessageSquare },
              ] as { id: LeadTab; label: string; icon: React.ElementType }[]).map(({ id: tabId, label, icon: TabIcon }) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === tabId ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <>
                <SectionCard title="Lead Details" icon={<User className="w-4 h-4" />}>
                  <div className="divide-y divide-border">
                    <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email} />
                    <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={phone} />
                    <DetailRow icon={<BookOpen className="w-4 h-4" />} label="Program" value={programName || programSlug} />
                    {validType === 'incomplete' && (
                      <DetailRow
                        icon={<FileWarning className="w-4 h-4" />}
                        label="Stopped at"
                        value={STEP_LABELS[(lead as IncompleteApplication).step_reached] ?? `Step ${(lead as IncompleteApplication).step_reached}`}
                      />
                    )}
                    <DetailRow icon={<Calendar className="w-4 h-4" />} label="Submitted" value={formatDate(createdAt)} />
                    <DetailRow icon={<Calendar className="w-4 h-4" />} label="Last active" value={updatedAt ? formatDate(updatedAt) : undefined} />
                  </div>
                </SectionCard>

                {message && (
                  <SectionCard title={validType === 'help-me' ? 'Their Message' : 'Message'} icon={<MessageSquare className="w-4 h-4" />}>
                    <p className="pt-4 text-sm text-muted-foreground leading-relaxed">{message}</p>
                  </SectionCard>
                )}
              </>
            )}

            {tab === 'notes' && (
              <AdminNotesPanel
                source={{ kind: 'lead', leadType: meta.noteType, leadId: lead.id }}
                stage={meta.stage}
                title="Internal Lead Notes"
                emptyText="No internal notes for this lead yet."
              />
            )}
          </div>

          <div className="space-y-5">
            {/* Lead tag */}
            <SectionCard title="Lead Tag" icon={<Tag className="w-4 h-4" />}>
              <div className="pt-4 space-y-3">
                <LeadStatusBadge status={currentLeadStatus} />
                {currentLeadStatus === 'completed' && lead.follow_up_completed_at && (
                  <p className="text-xs text-muted-foreground">
                    Completed {new Date(lead.follow_up_completed_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                <Select
                  value={currentLeadStatus}
                  onChange={(next) => statusMutation.mutate(next as LeadStatus)}
                  options={LEAD_STATUS_SELECT_OPTIONS}
                  disabled={statusMutation.isPending}
                  icon={<Tag className="w-3.5 h-3.5" />}
                />
              </div>
            </SectionCard>

            {helpMeLead && (
              <SectionCard title="Application Pipeline" icon={<Send className="w-4 h-4" />}>
                <div className="pt-4 space-y-3">
                  {helpMeLead.converted_to_pipeline && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="w-3 h-3" />
                      In Pipeline{helpMeLead.assigned_program_name ? ` · ${helpMeLead.assigned_program_name}` : ''}
                    </span>
                  )}
                  <Select
                    value={selectedPipelineProgramSlug}
                    onChange={setPipelineProgramSlug}
                    options={programOptions}
                    disabled={pipelineMutation.isPending}
                  />
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={!selectedPipelineProgramSlug || pipelineMutation.isPending}
                    onClick={() => {
                      const program = programs.find((p) => p.slug === selectedPipelineProgramSlug)
                      if (!program) return
                      pipelineMutation.mutate({ slug: program.slug, name: program.name })
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {pipelineMutation.isPending
                      ? 'Sending...'
                      : helpMeLead.converted_to_pipeline
                        ? 'Resend Pipeline Email'
                        : 'Send Pipeline Email'}
                  </Button>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Reach Out" icon={<Mail className="w-4 h-4" />}>
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowFollowUp(true)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors text-center"
                  >
                    <Mail className="w-5 h-5 text-primary" />
                    Email
                  </button>
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-green-50 hover:border-green-300 transition-colors text-center"
                    >
                      <PhoneCall className="w-5 h-5 text-green-600" />
                      Call
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
                      <PhoneCall className="w-5 h-5 text-muted-foreground" />
                      Call
                    </div>
                  )}
                  {whatsappUrl(phone) ? (
                    <a
                      href={whatsappUrl(phone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-[#25D366]/10 hover:border-[#25D366]/40 transition-colors text-center"
                    >
                      <Send className="w-5 h-5 text-[#25D366]" />
                      WhatsApp
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium opacity-40 text-center cursor-not-allowed">
                      <Send className="w-5 h-5 text-muted-foreground" />
                      WhatsApp
                    </div>
                  )}
                  {canCreateAppointment && (
                    <button
                      onClick={() => setShowAppointment(true)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 px-2 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors text-center"
                    >
                      <CalendarPlus className="w-5 h-5 text-primary" />
                      Appointment
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            {validType === 'interests' && (
              <SectionCard title="Intake Notification" icon={<Bell className="w-4 h-4" />}>
                <div className="pt-4">
                  {showNotify ? (
                    <NotifyForm
                      programSlug={(lead as ProgramInterest).program_slug}
                      programName={(lead as ProgramInterest).program_name}
                      ids={[lead.id]}
                      onDone={() => setShowNotify(false)}
                    />
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setShowNotify(true)}>
                      <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify of Intake Opening
                    </Button>
                  )}
                </div>
              </SectionCard>
            )}

            <button
              type="button"
              onClick={() => setTab('notes')}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm font-semibold">Internal Lead Notes</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Open the Notes tab to add rich-text admin notes for this lead.
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>

        <Dialog
          open={showFollowUp}
          onClose={() => setShowFollowUp(false)}
          title="Follow Up by Email"
          description={`Send a follow-up email to ${lead.email}.`}
          className="max-w-xl"
        >
          <FollowUpForm
            to={lead.email}
            name={lead.name}
            defaultSubject={meta.defaultSubject}
            onDone={() => setShowFollowUp(false)}
          />
        </Dialog>

        <CreateAppointmentDialog
          open={showAppointment}
          onClose={() => setShowAppointment(false)}
          prefill={{
            name: lead.name,
            email: lead.email,
            phone,
            reason: appointmentReason,
          }}
        />
      </div>
    </AdminLayout>
  )
}
