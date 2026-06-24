import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/AdminLayout'
import { PermissionGate } from '../../components/PermissionGate'
import { getAuditLogs, type AuditLogEntry } from '../../lib/api'
import { ShieldAlert, Trash2, User } from 'lucide-react'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  delete_application:           { label: 'Deleted Application',          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  delete_lead_program_interest: { label: 'Deleted Program Interest Lead', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  delete_lead_help_me:          { label: 'Deleted Help Me Lead',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  delete_lead_incomplete:       { label: 'Deleted Incomplete Lead',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

function SummaryCell({ summary }: { summary: Record<string, string | null> }) {
  const entries = Object.entries(summary).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="space-y-0.5">
      {entries.map(([k, v]) => (
        <p key={k} className="text-xs">
          <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}: </span>
          <span className="font-medium">{v}</span>
        </p>
      ))}
    </div>
  )
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    getAuditLogs(filter ? { action: filter } : {})
      .then(setLogs)
      .catch(() => toast.error('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <AdminLayout>
      <PermissionGate permission="dashboard.view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-muted-foreground" />
                Audit Logs
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Security log of admin delete operations. Visible to super admins only.</p>
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All actions</option>
              <option value="delete_application">Applications</option>
              <option value="delete_lead_program_interest">Program Interest Leads</option>
              <option value="delete_lead_help_me">Help Me Leads</option>
              <option value="delete_lead_incomplete">Incomplete Leads</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-border rounded-2xl">
              <Trash2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y">
              {logs.map(log => {
                const badge = ACTION_LABELS[log.action] ?? { label: log.action_display, color: 'bg-muted text-muted-foreground' }
                return (
                  <div key={log.id} className="flex items-start gap-4 px-4 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                        {log.ip_address && (
                          <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                        )}
                      </div>
                      <SummaryCell summary={log.resource_summary} />
                    </div>
                    <div className="text-right shrink-0">
                      {log.performed_by ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs font-medium">{log.performed_by.display_name}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">System</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PermissionGate>
    </AdminLayout>
  )
}
