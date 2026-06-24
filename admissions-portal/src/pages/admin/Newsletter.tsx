import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Users, Send, Plus, Pencil, Trash2,
  RefreshCw, Search, Download,
  CheckCircle2, Clock, AlertTriangle, ArrowLeft,
  Save,
} from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Dialog } from '../../components/ui/dialog'
import { EmailEditor } from '../../components/admin/EmailEditor'
import * as api from '../../lib/api'
import toast from 'react-hot-toast'
import type { NewsletterCampaign, NewsletterSubscriber } from '../../types'

// ── Shared helpers ────────────────────────────────────────────────────────────


function StatusBadge({ status }: { status: 'draft' | 'sent' }) {
  if (status === 'sent')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <Clock className="w-3 h-3" /> Draft
    </span>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Send confirmation dialog ──────────────────────────────────────────────────

function SendConfirmDialog({
  campaign,
  subscriberCount,
  onConfirm,
  onClose,
  sending,
}: {
  campaign: NewsletterCampaign
  subscriberCount: number
  onConfirm: () => void
  onClose: () => void
  sending: boolean
}) {
  return (
    <Dialog open onClose={onClose} title="Send Campaign" className="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-semibold">{campaign.subject}</p>
          {campaign.preview_text && (
            <p className="text-xs text-muted-foreground">{campaign.preview_text}</p>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="text-sm">
            <p className="font-medium">This will email <strong>{subscriberCount}</strong> active subscriber{subscriberCount !== 1 ? 's' : ''}.</p>
            <p className="text-muted-foreground text-xs mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button className="flex-1 gap-1.5" onClick={onConfirm} disabled={sending}>
            {sending ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending…' : 'Confirm Send'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Compose view ──────────────────────────────────────────────────────────────

interface ComposeForm {
  subject: string
  preview_text: string
  html_body: string
}

function ComposeView({
  initial,
  onBack,
  subscriberCount,
}: {
  initial?: NewsletterCampaign | null
  onBack: () => void
  subscriberCount: number
}) {
  const qc = useQueryClient()
  const isEditing = !!initial

  const [form, setForm] = useState<ComposeForm>({
    subject: initial?.subject ?? '',
    preview_text: initial?.preview_text ?? '',
    html_body: initial?.html_body ?? '',
  })
  const [sendTarget, setSendTarget] = useState<NewsletterCampaign | null>(null)
  const [savedId, setSavedId] = useState<string | null>(initial?.campaign_id ?? null)

  const patch = (key: keyof ComposeForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim()) throw new Error('Subject is required')
      if (!form.html_body.trim()) throw new Error('Email body is required')
      if (savedId) {
        return api.updateCampaign(savedId, form)
      }
      return api.createCampaign(form)
    },
    onSuccess: (campaign) => {
      setSavedId(campaign.campaign_id)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Draft saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sendMutation = useMutation({
    mutationFn: async (id: string) => api.sendCampaign(id),
    onSuccess: (result) => {
      toast.success(`Sent to ${result.sent_count} subscriber${result.sent_count !== 1 ? 's' : ''}!`)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      setSendTarget(null)
      onBack()
    },
    onError: (e: Error) => { toast.error(e.message); setSendTarget(null) },
  })

  const handleSaveAndSend = async () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return }
    if (!form.html_body.trim()) { toast.error('Email body cannot be empty'); return }

    let id = savedId
    const formChanged =
      form.subject !== (initial?.subject ?? '') ||
      form.preview_text !== (initial?.preview_text ?? '') ||
      form.html_body !== (initial?.html_body ?? '')
    if (!id || formChanged) {
      const saved = await (savedId
        ? api.updateCampaign(savedId, form)
        : api.createCampaign(form))
      id = saved.campaign_id
      setSavedId(id)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    }

    // Load the latest campaign object for the confirmation dialog
    const campaigns = await api.getNewsletterCampaigns()
    const campaign = campaigns.results.find((c) => c.campaign_id === id) ?? {
      ...form,
      campaign_id: id!,
      status: 'draft' as const,
      sent_at: undefined,
      sent_count: 0,
      failed_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setSendTarget(campaign)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-4 w-px bg-border" />
            <div>
              <h2 className="font-heading text-lg font-bold">
                {isEditing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Uses the same Nexa Academy email template as admissions messages.
              </p>
            </div>
          </div>
          <div className="lg:ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSaveAndSend}
              disabled={saveMutation.isPending || sendMutation.isPending}
            >
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold font-heading">Nexa Email Template</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Navy header, branded footer, unsubscribe links, and the same spacing used by admissions emails.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground mt-1">The send confirmation will show this audience before delivery.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold">Preview before sending</p>
              <p className="text-xs text-muted-foreground mt-1">Use the editor preview to review the exact email shell and content.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meta fields */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold font-heading">Campaign Details</p>
            <p className="text-xs text-muted-foreground">These appear in the recipient inbox before they open the email.</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <Mail className="w-3.5 h-3.5" /> admissions@nexaacademy.co.ke
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject line *</Label>
          <Input
            id="subject"
            placeholder="e.g. New cohort opens March 3rd"
            value={form.subject}
            onChange={(e) => patch('subject', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preview">Preview text <span className="text-muted-foreground font-normal">(inbox snippet)</span></Label>
          <Input
            id="preview"
            placeholder="e.g. Applications are now open for our next intake…"
            value={form.preview_text}
            onChange={(e) => patch('preview_text', e.target.value)}
          />
        </div>
        </div>
      </div>

      {/* Editor — fill remaining height */}
      <div className="flex-1 min-h-0" style={{ minHeight: 480 }}>
        <EmailEditor
          value={form.html_body}
          onChange={(html) => patch('html_body', html)}
          previewSubject={form.subject}
          previewText={form.preview_text}
        />
      </div>

      {sendTarget && (
        <SendConfirmDialog
          campaign={sendTarget}
          subscriberCount={subscriberCount}
          sending={sendMutation.isPending}
          onClose={() => setSendTarget(null)}
          onConfirm={() => sendMutation.mutate(sendTarget.campaign_id)}
        />
      )}
    </div>
  )
}

// ── Campaigns tab ─────────────────────────────────────────────────────────────

function CampaignsTab({
  onCompose,
  onEdit,
}: {
  onCompose: () => void
  onEdit: (c: NewsletterCampaign) => void
}) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const params = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => api.getNewsletterCampaigns(params),
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteCampaign,
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Could not delete campaign'),
  })

  const sendMutation = useMutation({
    mutationFn: api.sendCampaign,
    onSuccess: (res) => {
      toast.success(`Sent to ${res.sent_count} subscribers!`)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const campaigns: NewsletterCampaign[] = Array.isArray(data) ? data : (data?.results ?? [])
  const total = Array.isArray(data) ? data.length : (data?.count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleDelete = (c: NewsletterCampaign) => {
    if (!window.confirm(`Delete "${c.subject}"?`)) return
    deleteMutation.mutate(c.campaign_id)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'All campaigns' },
              { value: 'draft', label: 'Drafts only' },
              { value: 'sent', label: 'Sent only' },
            ]}
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="ml-auto">
          <Button className="gap-1.5" onClick={onCompose}>
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Mail className="w-8 h-8 opacity-30" />
            <p className="text-sm">No campaigns yet — create your first one!</p>
            <Button size="sm" className="gap-1.5 mt-2" onClick={onCompose}>
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Delivered</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaign_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-xs">{c.subject}</p>
                    {c.preview_text && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{c.preview_text}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'sent' ? (
                      <span className="font-medium">{c.sent_count}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {c.failed_count > 0 && (
                      <span className="ml-1.5 text-xs text-destructive">({c.failed_count} failed)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                    {c.status === 'sent' && c.sent_at ? fmtDate(c.sent_at) : fmtDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {c.status === 'draft' && (
                        <>
                          <button
                            onClick={() => onEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Send "${c.subject}" to subscribers now?`))
                                sendMutation.mutate(c.campaign_id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                            title="Send"
                            disabled={sendMutation.isPending}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="Delete"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subscribers tab ───────────────────────────────────────────────────────────

function SubscribersTab() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const params = {
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscribers', params],
    queryFn: () => api.getNewsletterSubscribers(params),
  })

  const exportMutation = useMutation({
    mutationFn: api.exportSubscribers,
    onSuccess: () => toast.success('CSV downloaded'),
    onError: () => toast.error('Export failed'),
  })

  const subscribers: NewsletterSubscriber[] = Array.isArray(data) ? data : (data?.results ?? [])
  const total = Array.isArray(data) ? data.length : (data?.count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 rounded-xl"
            placeholder="Search email or name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'All subscribers' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Unsubscribed' },
            ]}
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <Button
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading subscribers…
          </div>
        ) : subscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-sm">No subscribers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.subscription_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-sm truncate max-w-[180px]">{s.email}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border capitalize">
                      {s.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      s.status === 'active'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {s.status === 'active' ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                    {fmtDate(s.subscribed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

type PageView = 'list' | 'compose' | 'edit'

export function Newsletter() {
  const [view, setView] = useState<PageView>('list')
  const [editTarget, setEditTarget] = useState<NewsletterCampaign | null>(null)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'subscribers'>('campaigns')

  const { data: countData } = useQuery({
    queryKey: ['subscriber-count'],
    queryFn: api.getSubscriberCount,
  })
  const subscriberCount = countData?.count ?? 0

  // Campaign stats
  const { data: allCampaigns } = useQuery({
    queryKey: ['campaigns', { page_size: 200 }],
    queryFn: () => api.getNewsletterCampaigns({ page_size: 200 }),
  })
  const campaigns: NewsletterCampaign[] = Array.isArray(allCampaigns) ? allCampaigns : (allCampaigns?.results ?? [])
  const sentCount = campaigns.filter((c) => c.status === 'sent').length
  const draftCount = campaigns.filter((c) => c.status === 'draft').length

  const goCompose = () => { setEditTarget(null); setView('compose') }
  const goEdit = (c: NewsletterCampaign) => { setEditTarget(c); setView('edit') }
  const goBack = () => { setEditTarget(null); setView('list') }

  if (view === 'compose' || view === 'edit') {
    return (
      <AdminLayout>
        <ComposeView
          initial={editTarget}
          onBack={goBack}
          subscriberCount={subscriberCount}
        />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Newsletter</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Write and send email campaigns to your subscribers
            </p>
          </div>
          <Button className="gap-1.5" onClick={goCompose}>
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Active subscribers', value: subscriberCount, icon: Users, accent: true },
            { label: 'Campaigns sent', value: sentCount, icon: Send },
            { label: 'Drafts', value: draftCount, icon: Clock },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className={`rounded-2xl border bg-card p-4 flex items-center gap-3 ${accent ? 'border-primary/20 bg-primary/5' : 'border-border'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? 'bg-primary/15' : 'bg-muted'}`}>
                <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-1">
          {([
            { key: 'campaigns', label: 'Campaigns', icon: Mail },
            { key: 'subscribers', label: 'Subscribers', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'campaigns' ? (
          <CampaignsTab onCompose={goCompose} onEdit={goEdit} />
        ) : (
          <SubscribersTab />
        )}

      </div>
    </AdminLayout>
  )
}
