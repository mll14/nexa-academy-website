import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Search, Mail, Phone,
  CheckCircle2, Circle, RefreshCw,
  AtSign, Smartphone, Clock, RotateCcw, CalendarPlus,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { EmailEditor } from '../../components/admin/EmailEditor'
import { CreateAppointmentDialog } from './Appointments'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Dialog } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import toast from 'react-hot-toast'
import type { ContactMessage } from '../../types'
import { Pagination } from '../../components/ui/pagination'

const PAGE_SIZE = 10

type FollowUpFilter = 'pending' | 'done'

const READ_OPTIONS = [
  { value: 'all',    label: 'All messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'read',   label: 'Read' },
]

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at',  label: 'Oldest first' },
  { value: 'name',        label: 'Name A–Z' },
]

// ─── Follow-up status tabs ────────────────────────────────────────────────────

function FollowUpTabs({ value, onChange }: {
  value: FollowUpFilter
  onChange: (v: FollowUpFilter) => void
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
      {([
        { id: 'pending' as FollowUpFilter, label: 'Needs Follow-up', icon: Clock },
        { id: 'done'    as FollowUpFilter, label: 'Completed',        icon: CheckCircle2 },
      ]).map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === id
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Icon className="w-3.5 h-3.5" />{label}
        </button>
      ))}
    </div>
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function MessageDetailDialog({ msg, onClose, onMarkRead, onMarkCompleted, onRevertCompleted }: {
  msg: ContactMessage
  onClose: () => void
  onMarkRead: (id: string) => void
  onMarkCompleted: (id: string) => void
  onRevertCompleted: (id: string) => void
}) {
  const [subject, setSubject] = useState(`Re: ${msg.subject ?? ''}`.trim())
  const [body, setBody] = useState('')
  const [showAppointment, setShowAppointment] = useState(false)
  const [replying, setReplying] = useState(false)
  const preferredIcon = msg.preferred_contact === 'phone'
    ? <Smartphone className="w-3.5 h-3.5" />
    : <Mail className="w-3.5 h-3.5" />

  useEffect(() => {
    const safeName = escapeHtml(msg.name)
    const safeSubject = escapeHtml(msg.subject ?? '')
    const escapedMessage = escapeHtml(msg.message)
    setSubject(`Re: ${msg.subject ?? ''}`.trim())
    setBody([
      `<p>Hi ${safeName},</p>`,
      `<p>Thanks for reaching out${msg.subject ? ` about <strong>${safeSubject}</strong>` : ''}. I reviewed your message and wanted to follow up.</p>`,
      `<p>Message received:</p>`,
      `<blockquote>${escapedMessage.replace(/\n/g, '<br/>')}</blockquote>`,
      `<p>Best regards,<br/>Admissions Team</p>`,
    ].join(''))
  }, [msg])

  const sendMutation = useMutation({
    mutationFn: () => api.sendFollowUp({
      to: msg.email,
      name: msg.name,
      subject,
      message: body,
    }),
    onSuccess: () => {
      toast.success('Email sent')
      setReplying(false)
    },
    onError: (e: Error) => {
      setReplying(false)
      toast.error(e.message ?? 'Failed to send email')
    },
    onSettled: () => setReplying(false),
  })

  return (
    <>
      <Dialog open onClose={onClose} title={msg.subject || '(No subject)'} className="max-w-3xl">
        <div className="space-y-5">

          {/* Sender info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{msg.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{msg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                  msg.is_read
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {msg.is_read ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {msg.is_read ? 'Read' : 'Unread'}
                </span>
                {msg.follow_up_completed && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AtSign className="w-3.5 h-3.5 shrink-0" /> {msg.email}
              </span>
              {msg.phone && (
                <a href={`tel:${msg.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-3.5 h-3.5 shrink-0" /> {msg.phone}
                </a>
              )}
              {msg.preferred_contact && (
                <span className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  {preferredIcon} Prefers contact by {msg.preferred_contact}
                </span>
              )}
            </div>
          </div>

          {/* Message body */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</p>
            <div className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {msg.message}
            </div>
          </div>

          {/* Follow-up composer */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                <Mail className="w-3.5 h-3.5" /> Follow up
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowAppointment(true)}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Set Appointment
              </Button>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>To: {msg.name} &lt;{msg.email}&gt;</p>
              {msg.phone && <p>Phone: {msg.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" />
            </div>
            <div style={{ minHeight: 420 }}>
              <EmailEditor
                value={body}
                onChange={setBody}
                previewSubject={subject}
                previewText={msg.subject ?? ''}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Close
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={!subject.trim() || !body.trim() || sendMutation.isPending}
                onClick={() => {
                  setReplying(true)
                  sendMutation.mutate()
                }}
              >
                <Mail className="w-4 h-4" />
                {sendMutation.isPending ? 'Sending…' : replying ? 'Sending…' : 'Send Email'}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {!msg.is_read && (
              <Button className="flex-1 gap-1.5 min-w-0" onClick={() => { onMarkRead(msg.id); onClose() }}>
                <CheckCircle2 className="w-4 h-4" /> Mark as Read
              </Button>
            )}
            {!msg.follow_up_completed ? (
              <Button variant="outline" className="flex-1 gap-1.5 min-w-0"
                onClick={() => { onMarkCompleted(msg.id); onClose() }}>
                <CheckCircle2 className="w-4 h-4 text-success" /> Mark Follow-up Done
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 gap-1.5 min-w-0"
                onClick={() => { onRevertCompleted(msg.id); onClose() }}>
                <RotateCcw className="w-4 h-4 text-warning" /> Undo Completed
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      <CreateAppointmentDialog
        open={showAppointment}
        onClose={() => setShowAppointment(false)}
        prefill={{
          name: msg.name,
          email: msg.email,
          phone: msg.phone || undefined,
          reason: [
            `Contact follow-up: ${msg.subject || 'No subject'}`,
            msg.preferred_contact ? `Preferred contact: ${msg.preferred_contact}` : '',
            `Message: ${msg.message}`,
          ].filter(Boolean).join('\n'),
        }}
      />
    </>
  )
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, onClick }: { msg: ContactMessage; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-4 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors border-b border-border last:border-0 ${
        !msg.is_read ? 'bg-primary/3' : ''
      }`}>
      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        !msg.is_read ? 'bg-primary/15' : 'bg-muted'
      }`}>
        <span className={`text-xs font-bold ${!msg.is_read ? 'text-primary' : 'text-muted-foreground'}`}>
          {msg.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${!msg.is_read ? 'font-semibold' : 'font-medium'}`}>{msg.name}</span>
          {!msg.is_read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />}
          {msg.follow_up_completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-success">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${!msg.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
          {msg.subject || '(No subject)'} — {msg.message.slice(0, 80)}{msg.message.length > 80 ? '…' : ''}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(msg.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
        </span>
        {msg.preferred_contact && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {msg.preferred_contact === 'phone' ? <Smartphone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Messages() {
  const qc = useQueryClient()
  const [followUp, setFollowUp] = useState<FollowUpFilter>('pending')
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [sort, setSort] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  const params = {
    search: search || undefined,
    is_read: readFilter === 'unread' ? 'false' : readFilter === 'read' ? 'true' : undefined,
    follow_up_completed: followUp === 'done' ? 'true' : 'false',
    ordering: sort,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['messages', params],
    queryFn: () => api.getMessages(params),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markMessageRead(id),
    onSuccess: (_, id) => {
      qc.setQueryData(['messages', params], (old: typeof data) => {
        if (!old) return old
        const results = (Array.isArray(old) ? old : old.results ?? []).map((m: ContactMessage) =>
          m.id === id ? { ...m, is_read: true } : m
        )
        return Array.isArray(old) ? results : { ...old, results }
      })
      qc.invalidateQueries({ queryKey: ['admin', 'messages-count'] })
      toast.success('Marked as read')
    },
    onError: () => toast.error('Could not update message'),
  })

  const markCompleted = useMutation({
    mutationFn: (id: string) => api.markMessageCompleted(id),
    onSuccess: (_, id) => {
      qc.setQueryData(['messages', params], (old: typeof data) => {
        if (!old) return old
        const results = (Array.isArray(old) ? old : old.results ?? []).map((m: ContactMessage) =>
          m.id === id ? { ...m, follow_up_completed: true } : m
        )
        return Array.isArray(old) ? results : { ...old, results }
      })
      qc.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Follow-up marked as completed')
    },
    onError: () => toast.error('Could not update message'),
  })

  const revertCompleted = useMutation({
    mutationFn: (id: string) => api.revertMessageCompleted(id),
    onSuccess: (_, id) => {
      qc.setQueryData(['messages', params], (old: typeof data) => {
        if (!old) return old
        const results = (Array.isArray(old) ? old : old.results ?? []).map((m: ContactMessage) =>
          m.id === id ? { ...m, follow_up_completed: false } : m
        )
        return Array.isArray(old) ? results : { ...old, results }
      })
      qc.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Reverted — marked as needs follow-up')
    },
    onError: () => toast.error('Could not update message'),
  })

  const messages: ContactMessage[] = Array.isArray(data) ? data : (data?.results ?? [])
  const total = Array.isArray(data) ? data.length : (data?.count ?? 0)
  const unreadCount = messages.filter((m) => !m.is_read).length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openMessage = (msg: ContactMessage) => {
    setSelected(msg)
    if (!msg.is_read) markRead.mutate(msg.id)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Contact form submissions from visitors</p>
          </div>
          <button onClick={() => refetch()}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total',  value: total,             icon: MessageSquare },
            { label: 'Unread', value: unreadCount,        icon: Circle, accent: unreadCount > 0 },
            { label: 'Read',   value: total - unreadCount, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className={`rounded-2xl border bg-card p-4 flex items-center gap-3 ${accent ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? 'bg-primary/15' : 'bg-muted'}`}>
                <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold leading-tight">{isLoading ? '—' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Follow-up tabs */}
        <FollowUpTabs value={followUp} onChange={(v) => { setFollowUp(v); setPage(1) }} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input className="pl-9 h-9 rounded-xl" placeholder="Search name, email or subject…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="w-40">
            <Select value={readFilter} onChange={(v) => { setReadFilter(v); setPage(1) }} options={READ_OPTIONS} />
          </div>
          <div className="w-40">
            <Select value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </div>
        </div>

        {/* Message list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <MessageSquare className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                {followUp === 'done' ? 'No completed follow-ups yet.' : 'No messages found'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} onClick={() => openMessage(msg)} />
            ))
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* Detail dialog */}
      {selected && (
        <MessageDetailDialog
          msg={selected}
          onClose={() => setSelected(null)}
          onMarkRead={(id) => markRead.mutate(id)}
          onMarkCompleted={(id) => markCompleted.mutate(id)}
          onRevertCompleted={(id) => revertCompleted.mutate(id)}
        />
      )}
    </AdminLayout>
  )
}
