import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, CalendarDays, Bell } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { Intake, Program } from '../../types'
import { DeleteConfirmDialog } from '../../components/ui/delete-confirm-dialog'

// ─── Notify interested panel (inline, per intake) ────────────────────────────

function IntakeNotifyPanel({ intake, programSlug, onClose }: {
  intake: Intake; programSlug: string; onClose: () => void
}) {
  const [deadline, setDeadline] = useState(intake.application_deadline ?? '')
  const mutation = useMutation({
    mutationFn: () => api.notifyProgramInterests({
      program_slug: programSlug,
      program_name: intake.program_name,
      start_date: intake.start_date,
      deadline: deadline || undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Notified ${res.sent} interested ${res.sent === 1 ? 'person' : 'people'}${res.failed ? ` (${res.failed} failed)` : ''}`)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send notifications'),
  })
  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5" /> Notify interested parties for this intake
      </p>
      <p className="text-xs text-muted-foreground">
        Start date <strong>{intake.start_date}</strong> will be included. Optionally set an application deadline.
      </p>
      <div className="flex gap-3 items-end">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Application deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Sending…' : 'Send Notifications'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

interface IntakeForm {
  program: string
  start_date: string
  end_date: string
  application_deadline: string
  max_seats: string
  status: 'open' | 'closed' | 'draft'
  notes: string
}

const EMPTY: IntakeForm = { program: '', start_date: '', end_date: '', application_deadline: '', max_seats: '', status: 'open', notes: '' }

export function Intakes() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Intake | null>(null)
  const [form, setForm] = useState<IntakeForm>(EMPTY)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Intake | null>(null)

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['admin', 'intakes'],
    queryFn: () => api.getIntakes({ ordering: 'start_date' }),
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => api.getPrograms(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Intake>) => api.createIntake(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'intakes'] }); setCreating(false); setForm(EMPTY); toast.success('Intake created') },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intake> }) => api.updateIntake(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'intakes'] }); setEditing(null); toast.success('Intake updated') },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteIntake(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'intakes'] }); setDeleteTarget(null); toast.success('Intake deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = (field: keyof IntakeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const formToPayload = (f: IntakeForm): Partial<Intake> => ({
    program: f.program,
    start_date: f.start_date,
    end_date: f.end_date || undefined,
    application_deadline: f.application_deadline || undefined,
    max_seats: f.max_seats ? parseInt(f.max_seats) : undefined,
    status: f.status,
    notes: f.notes || undefined,
  })

  const openEdit = (intake: Intake) => {
    setEditing(intake)
    setForm({ program: intake.program, start_date: intake.start_date, end_date: intake.end_date ?? '', application_deadline: intake.application_deadline ?? '', max_seats: intake.max_seats != null ? String(intake.max_seats) : '', status: intake.status, notes: intake.notes ?? '' })
  }

  const statusClass = (s: string) =>
    s === 'open' ? 'bg-success/10 text-success' : s === 'closed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'

  const IntakeFormPanel = ({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) => (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Program *</Label>
          <Select
            value={form.program}
            onChange={(v) => setForm((p) => ({ ...p, program: v }))}
            options={[
              { value: '', label: 'Select a program' },
              ...programs.map((p: Program) => ({ value: p.program_id, label: p.name })),
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Start Date *</Label>
          <Input type="date" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" value={form.end_date} onChange={set('end_date')} />
        </div>
        <div className="space-y-1.5">
          <Label>Application Deadline</Label>
          <Input type="date" value={form.application_deadline} onChange={set('application_deadline')} />
        </div>
        <div className="space-y-1.5">
          <Label>Max Seats</Label>
          <Input type="number" value={form.max_seats} onChange={set('max_seats')} placeholder="Leave blank for unlimited" min="1" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onChange={(v) => setForm((p) => ({ ...p, status: v as IntakeForm['status'] }))}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
              { value: 'draft', label: 'Draft' },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={onSave} disabled={saving || !form.program || !form.start_date}>{saving ? 'Saving…' : 'Save Intake'}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Intakes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{intakes.length} intake{intakes.length !== 1 ? 's' : ''}</p>
          </div>
          {!creating && <Button onClick={() => { setCreating(true); setEditing(null); setForm(EMPTY) }}><Plus className="w-4 h-4 mr-1.5" />Add Intake</Button>}
        </div>

        {creating && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">New Intake</h2>
              </div>
              <Separator />
              <IntakeFormPanel onSave={() => createMutation.mutate(formToPayload(form))} onCancel={() => { setCreating(false); setForm(EMPTY) }} saving={createMutation.isPending} />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : intakes.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No intakes yet.</div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
            {intakes.map((intake: Intake) => (
              <div key={intake.id}>
                {editing?.id === intake.id ? (
                  <div className="p-5 space-y-4">
                    <p className="font-semibold text-sm">Editing intake</p>
                    <Separator />
                    <IntakeFormPanel
                      onSave={() => updateMutation.mutate({ id: intake.id, data: formToPayload(form) })}
                      onCancel={() => setEditing(null)}
                      saving={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{intake.program_name}</p>
                          <Badge className={statusClass(intake.status)}>{intake.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Starts {formatDate(intake.start_date)}
                          {intake.application_deadline ? ` · Deadline ${formatDate(intake.application_deadline)}` : ''}
                          {intake.seats_remaining != null ? ` · ${intake.seats_remaining} seats left` : intake.max_seats ? ` · ${intake.max_seats} seats` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {intake.status === 'open' && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => setNotifyingId(notifyingId === intake.id ? null : intake.id)}
                            title="Notify interested parties"
                          >
                            <Bell className="w-3.5 h-3.5 mr-1" />
                            Notify Interested
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(intake)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(intake)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {notifyingId === intake.id && (() => {
                      const prog = (programs as Program[]).find((p) => p.program_id === intake.program)
                      return (
                        <IntakeNotifyPanel
                          intake={intake}
                          programSlug={prog?.slug ?? ''}
                          onClose={() => setNotifyingId(null)}
                        />
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Intake"
        itemName={deleteTarget ? `${deleteTarget.program_name} – ${deleteTarget.start_date}` : ''}
        consequences="Deleting this intake will permanently remove the cohort and its calendar sync. Students who applied to this cohort will no longer have an active intake. This cannot be undone."
        isPending={deleteMutation.isPending}
      />
      </div>
    </AdminLayout>
  )
}
