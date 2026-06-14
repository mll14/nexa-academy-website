import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/AdminLayout'
import { getNotifications, markAllNotificationsRead } from '../../lib/api'
import type { Notification } from '../../types'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
import toast from 'react-hot-toast'

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function Notifications() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    getNotifications(50)
      .then(setItems)
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  const handleMarkAll = async () => {
    if (unreadCount === 0) return
    setMarking(true)
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications as read')
    } finally {
      setMarking(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={marking}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <BellOff className="w-10 h-10 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                  n.read
                    ? 'bg-card border-border'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      n.read ? 'bg-muted' : 'bg-primary/15'
                    }`}
                  >
                    <Bell
                      className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-primary'}`}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      n.read ? 'text-foreground/80' : 'text-foreground font-medium'
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(n.timestamp ?? n.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
