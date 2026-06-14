import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Search, Mail, Phone,
  CheckCircle2, Circle, RefreshCw,
  AtSign, Smartphone,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Dialog } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import * as api from '../../lib/api'
import toast from 'react-hot-toast'
import type { ContactMessage } from '../../types'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all',     label: 'All messages' },
  { value: 'unread',  label: 'Unread' },
  { value: 'read',    label: 'Read' },
]

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at',  label: 'Oldest first' },
  { value: 'name',        label: 'Name A–Z' },
]


function MessageDetailDialog({ msg, onClose, onMarkRead }: {
  msg: ContactMessage
  onClose: () => void
  onMarkRead: (id: string) => void
}) {
  const preferredIcon = msg.preferred_contact === 'phone'
    ? <Smartphone className="w-3.5 h-3.5" />
    : <Mail className="w-3.5 h-3.5" />

  return (
    <Dialog
      open
      onClose={onClose}
      title={msg.subject || '(No subject)'}
      className="max-w-lg"
    >
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
            <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
              msg.is_read
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {msg.is_read ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              {msg.is_read ? 'Read' : 'Unread'}
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a href={`mailto:${msg.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <AtSign className="w-3.5 h-3.5 shrink-0" /> {msg.email}
            </a>
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

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {!msg.is_read && (
            <Button
              className="flex-1 gap-1.5"
              onClick={() => { onMarkRead(msg.id); onClose() }}
            >
              <CheckCircle2 className="w-4 h-4" /> Mark as Read
            </Button>
          )}
          <a
            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject ?? '')}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border hover:border-primary hover:text-primary text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" /> Reply by Email
          </a>
        </div>
      </div>
    </Dialog>
  )
}

function MessageRow({ msg, onClick }: { msg: ContactMessage; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors border-b border-border last:border-0 ${
        !msg.is_read ? 'bg-primary/3' : ''
      }`}
    >
      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        !msg.is_read ? 'bg-primary/15' : 'bg-muted'
      }`}>
        <span className={`text-xs font-bold ${!msg.is_read ? 'text-primary' : 'text-muted-foreground'}`}>
          {msg.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${!msg.is_read ? 'font-semibold' : 'font-medium'}`}>
            {msg.name}
          </span>
          {!msg.is_read && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
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

export function Messages() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [sort, setSort] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  const params = {
    search: search || undefined,
    is_read: readFilter === 'unread' ? 'false' : readFilter === 'read' ? 'true' : undefined,
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
            <p className="text-sm text-muted-foreground mt-0.5">
              Contact form submissions from visitors
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total',  value: total,        icon: MessageSquare },
            { label: 'Unread', value: unreadCount,   icon: Circle,       accent: unreadCount > 0 },
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 rounded-xl"
              placeholder="Search name, email or subject…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="w-40">
            <Select value={readFilter} onChange={(v) => { setReadFilter(v); setPage(1) }} options={STATUS_OPTIONS} />
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
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} onClick={() => openMessage(msg)} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selected && (
        <MessageDetailDialog
          msg={selected}
          onClose={() => setSelected(null)}
          onMarkRead={(id) => markRead.mutate(id)}
        />
      )}
    </AdminLayout>
  )
}
