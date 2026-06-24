import { useEffect, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Video,
  MapPin,
  Calendar,
  Mail,
  Phone,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import * as api from '../../lib/api'
import type { Appointment, AppointmentStatus } from '../../types'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
  no_show: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
]

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export function AppointmentDetail() {
  const { id } = useParams({ from: '/admin/appointments/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const { data: appt, isLoading, error } = useQuery<Appointment>({
    queryKey: ['admin', 'appointment', id],
    queryFn: () => api.getAppointment(id),
  })

  useEffect(() => {
    setNotes(appt?.admin_notes ?? '')
  }, [appt])

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; admin_notes?: string }) =>
      api.updateAppointment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointment', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      toast.success('Updated.')
      setNotesEditing(false)
    },
    onError: () => toast.error('Update failed.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointment', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      toast.success('Appointment cancelled.')
      setShowCancelConfirm(false)
    },
    onError: () => toast.error('Could not cancel appointment.'),
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !appt) {
    return (
      <AdminLayout>
        <div className="text-center py-16 text-muted-foreground">
          Appointment not found.
        </div>
      </AdminLayout>
    )
  }

  const isCancelled = appt.status === 'cancelled'

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate({ to: '/admin/appointments' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">{appt.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Booked {new Date(appt.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_STYLES[appt.status] ?? ''}`}>
            {appt.status_label}
          </span>
        </div>

        {/* Appointment info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border rounded-lg p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appointment Details</p>
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm font-medium">{formatDateTime(appt.chosen_time)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              {appt.appointment_type === 'virtual'
                ? <Video className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                : <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{appt.appointment_type_label}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Host</p>
                <p className="text-sm font-medium">{appt.host_label}</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</p>
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href={`mailto:${appt.email}`} className="text-sm font-medium text-primary hover:underline">{appt.email}</a>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <a href={`tel:${appt.phone}`} className="text-sm font-medium text-primary hover:underline">{appt.phone}</a>
              </div>
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div className="border rounded-lg p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Purpose</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{appt.reason}</p>
        </div>

        {/* Meet link (virtual only) */}
        {appt.appointment_type === 'virtual' && appt.meet_url && (
          <div className="border rounded-lg p-5 bg-green-50 border-green-200">
            <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">Google Meet Link</p>
            <a
              href={appt.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline break-all"
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              {appt.meet_url}
            </a>
          </div>
        )}

        {/* Update status */}
        {!isCancelled && (
          <div className="border rounded-lg p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.filter(o => o.value !== appt.status).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateMutation.mutate({ status: value })}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {value === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {value === 'no_show' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                  Mark as {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin notes */}
        <div className="border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Notes</p>
            {!notesEditing && (
              <button
                onClick={() => setNotesEditing(true)}
                className="text-xs text-primary hover:underline"
              >
                {appt.admin_notes ? 'Edit' : 'Add notes'}
              </button>
            )}
          </div>
          {notesEditing ? (
            <div className="space-y-3">
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {appt.admin_notes || 'No notes yet.'}
            </p>
          )}
        </div>

        {/* Cancel */}
        {!isCancelled && (
          <div className="border border-red-200 rounded-lg p-5 bg-red-50">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">Cancel Appointment</p>
            <p className="text-sm text-muted-foreground mb-3">
              This will cancel the appointment and remove the calendar event. The attendee will be notified.
            </p>
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Cancel Appointment
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel It'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                >
                  Keep It
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
