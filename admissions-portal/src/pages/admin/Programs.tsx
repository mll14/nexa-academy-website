import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, BookOpen, CalendarDays, ChevronRight,
  Pencil, Trash2, Clock, CheckCircle2, XCircle,
  Tag, BarChart2, Calendar, Users, AlignLeft,
  GraduationCap, DollarSign,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Dialog } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Program, Intake } from '../../types'

// ─── Shared helpers ──────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{value}</span>
      </div>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ─── Programs tab ────────────────────────────────────────────────────────────

interface ProgramForm {
  name: string; slug: string; description: string; category: string
  level: string; duration: string; duration_months: string
  price: string; status: string; coming_soon: boolean
}
const PROG_EMPTY: ProgramForm = { name: '', slug: '', description: '', category: '', level: 'beginner', duration: '', duration_months: '3', price: '', status: 'active', coming_soon: false }

function programStatusConfig(s: string) {
  if (s === 'active')      return { cls: 'bg-success/10 text-success border-success/20',     label: 'Active' }
  if (s === 'inactive')    return { cls: 'bg-muted text-muted-foreground border-border',      label: 'Inactive' }
  if (s === 'coming_soon') return { cls: 'bg-warning/10 text-warning border-warning/20',      label: 'Coming Soon' }
  return                          { cls: 'bg-muted text-muted-foreground border-border',      label: s }
}

function ProgramFormFields({ form, setForm }: {
  form: ProgramForm
  setForm: React.Dispatch<React.SetStateAction<ProgramForm>>
}) {
  const set = (field: keyof ProgramForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <FieldGroup label="Program Name *">
        <Input value={form.name} onChange={set('name')} placeholder="Software Engineering" />
      </FieldGroup>
      <FieldGroup label="Slug">
        <Input value={form.slug} onChange={set('slug')} placeholder="software-engineering" />
      </FieldGroup>
      <div className="sm:col-span-2">
        <FieldGroup label="Description">
          <Textarea rows={3} value={form.description} onChange={set('description')} placeholder="What will students learn?" />
        </FieldGroup>
      </div>
      <FieldGroup label="Category">
        <Input value={form.category} onChange={set('category')} placeholder="e.g. Engineering" />
      </FieldGroup>
      <FieldGroup label="Level">
        <Select
          value={form.level}
          onChange={(v) => setForm((p) => ({ ...p, level: v }))}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
      </FieldGroup>
      <FieldGroup label="Duration (label)">
        <Input value={form.duration} onChange={set('duration')} placeholder="e.g. 3 months" />
      </FieldGroup>
      <FieldGroup label="Duration (months)">
        <Input type="number" value={form.duration_months} onChange={set('duration_months')} min="1" />
      </FieldGroup>
      <FieldGroup label="Price (KSh)">
        <Input type="number" value={form.price} onChange={set('price')} placeholder="e.g. 50000" />
      </FieldGroup>
      <FieldGroup label="Status">
        <Select
          value={form.status}
          onChange={(v) => setForm((p) => ({ ...p, status: v }))}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'coming_soon', label: 'Coming Soon' },
          ]}
        />
      </FieldGroup>
    </div>
  )
}

function ProgramsTab() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Program | null>(null)
  const [showForm, setShowForm] = useState<'create' | 'edit' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Program | null>(null)
  const [form, setForm] = useState<ProgramForm>(PROG_EMPTY)

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => api.getPrograms(),
  })

  const formToPayload = (f: ProgramForm): Partial<Program> => ({
    name: f.name, slug: f.slug || f.name.toLowerCase().replace(/\s+/g, '-'),
    description: f.description, category: f.category, level: f.level,
    duration: f.duration, duration_months: parseInt(f.duration_months) || 3,
    price: f.price ? parseFloat(f.price) : null,
    status: f.status, coming_soon: f.coming_soon,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Program>) => api.createProgram(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'programs'] })
      setShowForm(null); setForm(PROG_EMPTY)
      toast.success('Program created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Program> }) => api.updateProgram(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin', 'programs'] })
      setShowForm(null); setSelected(updated)
      toast.success('Program updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProgram(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'programs'] })
      setSelected(null); setConfirmDelete(null)
      toast.success('Program deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEdit = (p: Program) => {
    setForm({ name: p.name, slug: p.slug, description: p.description, category: p.category ?? '', level: p.level ?? 'beginner', duration: p.duration ?? '', duration_months: String(p.duration_months ?? 3), price: p.price != null ? String(p.price) : '', status: p.status, coming_soon: p.coming_soon })
    setShowForm('edit')
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${(programs as Program[]).length} program${(programs as Program[]).length !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={() => { setForm(PROG_EMPTY); setShowForm('create') }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Program
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2 mt-4">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : (programs as Program[]).length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No programs yet.</p>
        </div>
      ) : (
        <div className="mt-4 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {(programs as Program[]).map((p) => {
            const cfg = programStatusConfig(p.status)
            return (
              <div
                key={p.program_id}
                onClick={() => setSelected(p)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>
                    {p.coming_soon && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-warning/10 text-warning border-warning/20">Coming Soon</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.category, p.level, p.duration].filter(Boolean).join(' · ')}
                    {p.price != null && <span className="ml-1.5 font-medium text-primary">KSh {p.price.toLocaleString('en-KE')}</span>}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <Dialog
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.name}
          description={selected.slug}
          className="max-w-lg"
        >
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              {(() => { const cfg = programStatusConfig(selected.status); return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span> })()}
              {selected.coming_soon && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-warning/10 text-warning border-warning/20">Coming Soon</span>}
            </div>

            <div className="divide-y divide-border">
              <DetailRow icon={<Tag className="w-4 h-4" />} label="Category" value={selected.category} />
              <DetailRow icon={<BarChart2 className="w-4 h-4" />} label="Level" value={selected.level} />
              <DetailRow icon={<Clock className="w-4 h-4" />} label="Duration" value={selected.duration ? `${selected.duration} (${selected.duration_months} months)` : undefined} />
              <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Price" value={selected.price != null ? `KSh ${selected.price.toLocaleString('en-KE')}` : undefined} />
              {selected.original_price != null && (
                <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Original Price" value={`KSh ${selected.original_price.toLocaleString('en-KE')}`} />
              )}
              <DetailRow icon={<GraduationCap className="w-4 h-4" />} label="Certificate" value={selected.offers_certificate ? 'Yes' : 'No'} />
            </div>

            {selected.description && (
              <>
                <Separator />
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    <AlignLeft className="w-3.5 h-3.5" /> Description
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2 pt-1">
              <Button className="flex-1" onClick={() => openEdit(selected)}>
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setConfirmDelete(selected)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Create dialog */}
      <Dialog
        open={showForm === 'create'}
        onClose={() => setShowForm(null)}
        title="New Program"
        description="Fill in the details for the new program."
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <ProgramFormFields form={form} setForm={setForm} />
          <div className="flex gap-3 pt-2">
            <Button onClick={() => createMutation.mutate(formToPayload(form))} disabled={createMutation.isPending || !form.name.trim()}>
              {createMutation.isPending ? 'Creating…' : 'Create Program'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      {selected && (
        <Dialog
          open={showForm === 'edit'}
          onClose={() => setShowForm(null)}
          title={`Edit: ${selected.name}`}
          description="Update program details."
          className="max-w-2xl"
        >
          <div className="space-y-5">
            <ProgramFormFields form={form} setForm={setForm} />
            <div className="flex gap-3 pt-2">
              <Button onClick={() => updateMutation.mutate({ id: selected.program_id, data: formToPayload(form) })} disabled={updateMutation.isPending || !form.name.trim()}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(null)}>Cancel</Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <Dialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Program"
          description={`Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.`}
          className="max-w-sm"
        >
          <div className="flex gap-3 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(confirmDelete.program_id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </Dialog>
      )}
    </>
  )
}

// ─── Intakes tab ─────────────────────────────────────────────────────────────

interface IntakeForm {
  program: string; start_date: string; end_date: string
  application_deadline: string; max_seats: string
  status: 'open' | 'closed' | 'draft'; notes: string
}
const INTAKE_EMPTY: IntakeForm = { program: '', start_date: '', end_date: '', application_deadline: '', max_seats: '', status: 'open', notes: '' }

function intakeStatusConfig(s: string) {
  if (s === 'open')   return { cls: 'bg-success/10 text-success border-success/20',         icon: CheckCircle2, label: 'Open' }
  if (s === 'closed') return { cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle,  label: 'Closed' }
  return                     { cls: 'bg-muted text-muted-foreground border-border',          icon: Clock,       label: 'Draft' }
}

function IntakeFormFields({ form, setForm, programs }: {
  form: IntakeForm
  setForm: React.Dispatch<React.SetStateAction<IntakeForm>>
  programs: Program[]
}) {
  const set = (field: keyof IntakeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <FieldGroup label="Program *">
          <Select
            value={form.program}
            onChange={(v) => setForm((p) => ({ ...p, program: v }))}
            placeholder="Select a program…"
            options={programs.map((p) => ({ value: p.program_id, label: p.name }))}
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Start Date *">
        <Input type="date" value={form.start_date} onChange={set('start_date')} />
      </FieldGroup>
      <FieldGroup label="End Date">
        <Input type="date" value={form.end_date} onChange={set('end_date')} />
      </FieldGroup>
      <FieldGroup label="Application Deadline">
        <Input type="date" value={form.application_deadline} onChange={set('application_deadline')} />
      </FieldGroup>
      <FieldGroup label="Max Seats">
        <Input type="number" value={form.max_seats} onChange={set('max_seats')} placeholder="Unlimited" min="1" />
      </FieldGroup>
      <FieldGroup label="Status">
        <Select
          value={form.status}
          onChange={(v) => setForm((p) => ({ ...p, status: v as IntakeForm['status'] }))}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'draft', label: 'Draft' },
          ]}
        />
      </FieldGroup>
      <FieldGroup label="Notes">
        <Input value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
      </FieldGroup>
    </div>
  )
}

function IntakesTab() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Intake | null>(null)
  const [showForm, setShowForm] = useState<'create' | 'edit' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Intake | null>(null)
  const [form, setForm] = useState<IntakeForm>(INTAKE_EMPTY)

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['admin', 'intakes'],
    queryFn: () => api.getIntakes({ ordering: 'start_date' }),
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => api.getPrograms(),
  })

  const formToPayload = (f: IntakeForm): Partial<Intake> => ({
    program: f.program, start_date: f.start_date,
    end_date: f.end_date || undefined,
    application_deadline: f.application_deadline || undefined,
    max_seats: f.max_seats ? parseInt(f.max_seats) : undefined,
    status: f.status, notes: f.notes || undefined,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Intake>) => api.createIntake(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'intakes'] })
      setShowForm(null); setForm(INTAKE_EMPTY)
      toast.success('Intake created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intake> }) => api.updateIntake(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin', 'intakes'] })
      setShowForm(null); setSelected(updated)
      toast.success('Intake updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteIntake(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'intakes'] })
      setSelected(null); setConfirmDelete(null)
      toast.success('Intake deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEdit = (intake: Intake) => {
    setForm({ program: intake.program, start_date: intake.start_date, end_date: intake.end_date ?? '', application_deadline: intake.application_deadline ?? '', max_seats: intake.max_seats != null ? String(intake.max_seats) : '', status: intake.status, notes: intake.notes ?? '' })
    setShowForm('edit')
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${(intakes as Intake[]).length} intake${(intakes as Intake[]).length !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={() => { setForm(INTAKE_EMPTY); setShowForm('create') }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Intake
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2 mt-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      ) : (intakes as Intake[]).length === 0 ? (
        <div className="mt-4 py-16 text-center border border-dashed border-border rounded-2xl">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No intakes yet.</p>
        </div>
      ) : (
        <div className="mt-4 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {(intakes as Intake[]).map((intake) => {
            const cfg = intakeStatusConfig(intake.status)
            const StatusIcon = cfg.icon
            return (
              <div
                key={intake.id}
                onClick={() => setSelected(intake)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{intake.program_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                      <StatusIcon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Starts {formatDate(intake.start_date)}
                    {intake.application_deadline && ` · Deadline ${formatDate(intake.application_deadline)}`}
                    {intake.seats_remaining != null
                      ? ` · ${intake.seats_remaining} seats left`
                      : intake.max_seats
                      ? ` · ${intake.max_seats} seats`
                      : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <Dialog
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.program_name}
          description={`Intake · ${formatDate(selected.start_date)}`}
          className="max-w-md"
        >
          <div className="space-y-4">
            {/* Status */}
            {(() => {
              const cfg = intakeStatusConfig(selected.status)
              const StatusIcon = cfg.icon
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                  <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
                </span>
              )
            })()}

            <div className="divide-y divide-border">
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Start date" value={formatDate(selected.start_date)} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="End date" value={selected.end_date ? formatDate(selected.end_date) : null} />
              <DetailRow icon={<Clock className="w-4 h-4" />} label="Application deadline" value={selected.application_deadline ? formatDate(selected.application_deadline) : null} />
              <DetailRow icon={<Users className="w-4 h-4" />} label="Max seats" value={selected.max_seats != null ? String(selected.max_seats) : null} />
              <DetailRow icon={<Users className="w-4 h-4" />} label="Seats remaining" value={selected.seats_remaining != null ? String(selected.seats_remaining) : null} />
            </div>

            {selected.notes && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.notes}</p>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2 pt-1">
              <Button className="flex-1" onClick={() => openEdit(selected)}>
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setConfirmDelete(selected)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Create dialog */}
      <Dialog
        open={showForm === 'create'}
        onClose={() => setShowForm(null)}
        title="New Intake"
        description="Set up a new intake for a program."
        className="max-w-lg"
      >
        <div className="space-y-5">
          <IntakeFormFields form={form} setForm={setForm} programs={programs as Program[]} />
          <div className="flex gap-3 pt-2">
            <Button onClick={() => createMutation.mutate(formToPayload(form))} disabled={createMutation.isPending || !form.program || !form.start_date}>
              {createMutation.isPending ? 'Creating…' : 'Create Intake'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      {selected && (
        <Dialog
          open={showForm === 'edit'}
          onClose={() => setShowForm(null)}
          title={`Edit: ${selected.program_name}`}
          description={`Intake starting ${formatDate(selected.start_date)}`}
          className="max-w-lg"
        >
          <div className="space-y-5">
            <IntakeFormFields form={form} setForm={setForm} programs={programs as Program[]} />
            <div className="flex gap-3 pt-2">
              <Button onClick={() => updateMutation.mutate({ id: selected.id, data: formToPayload(form) })} disabled={updateMutation.isPending || !form.program || !form.start_date}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(null)}>Cancel</Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Dialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Intake"
          description={`Delete the ${confirmDelete.program_name} intake starting ${formatDate(confirmDelete.start_date)}? This cannot be undone.`}
          className="max-w-sm"
        >
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirmDelete.id)}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </Dialog>
      )}
    </>
  )
}

// ─── Combined page ────────────────────────────────────────────────────────────

type Tab = 'programs' | 'intakes'

export function Programs() {
  const [tab, setTab] = useState<Tab>('programs')

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-heading text-2xl font-bold">Programs &amp; Intakes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage course offerings and their intake schedules.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: 'programs', label: 'Programs', icon: BookOpen },
            { id: 'intakes',  label: 'Intakes',  icon: CalendarDays },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'programs' ? <ProgramsTab /> : <IntakesTab />}
      </div>
    </AdminLayout>
  )
}
