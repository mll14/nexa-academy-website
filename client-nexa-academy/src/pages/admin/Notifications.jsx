import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import AlertDialog from "@/components/ui/AlertDialog";
import notificationService from "@/services/notificationService";
import apiService from "@/services/apiService";
import { UnderlineTabs } from "@/components/admin/UnderlineTabs";
import toast from "react-hot-toast";
import {
  Bell,
  Info,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  Trash2,
  CheckCheck,
  Eye,
  Send,
  Loader2,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_META = {
  info:     { icon: Info,         label: "Info",     color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20" },
  payment:  { icon: CreditCard,   label: "Payment",  color: "text-green-600",   bg: "bg-green-50 dark:bg-green-900/20" },
  pending:  { icon: Clock,        label: "Pending",  color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20" },
  approved: { icon: CheckCircle2, label: "Approved", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  rejected: { icon: XCircle,      label: "Rejected", color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20" },
  course:   { icon: BookOpen,     label: "Course",   color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/20" },
};

const TYPE_FILTER_TABS = [
  { value: "all",      label: "All" },
  { value: "info",     label: "Info" },
  { value: "payment",  label: "Payment" },
  { value: "pending",  label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "course",   label: "Course" },
];

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────

function InboxTab() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [typeFilter, setTypeFilter]       = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await notificationService.getNotifications();
    if (res.success) {
      setNotifications(res.data || []);
    } else {
      setError("Failed to load notifications.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, read: true } : n))
    );
  };

  const handleDelete = async (id) => {
    const res = await notificationService.deleteNotification(id);
    if (res.success) {
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
      toast.success("Notification deleted");
    } else {
      toast.error("Delete failed");
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  const handleRowClick = async (notif) => {
    if (!notif.read) await handleMarkRead(notif.notification_id);
    if (notif.link) navigate(notif.link);
  };

  const filtered = typeFilter === "all"
    ? notifications
    : notifications.filter((n) => n.type === typeFilter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Type tabs + mark all read */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          <UnderlineTabs tabs={TYPE_FILTER_TABS} active={typeFilter} onChange={setTypeFilter} />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
          className="gap-1.5 text-xs mb-0.5 shrink-0"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Mark all read
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
          <Button size="sm" variant="ghost" onClick={load}>Retry</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-16 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No notifications{typeFilter !== "all" ? ` of type "${typeFilter}"` : ""}.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map((notif) => {
            const meta = TYPE_META[notif.type] || TYPE_META.info;
            const TypeIcon = meta.icon;
            return (
              <div
                key={notif.notification_id}
                onClick={() => handleRowClick(notif)}
                className={`
                  flex items-start gap-3 px-5 py-4 relative group transition-colors
                  ${notif.link ? "cursor-pointer hover:bg-muted/30" : ""}
                  ${!notif.read ? "bg-primary/[0.03]" : ""}
                `}
              >
                {/* Unread stripe */}
                {!notif.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full" />
                )}

                {/* Type icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                  <TypeIcon className={`w-4 h-4 ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!notif.read ? "font-semibold" : "font-medium"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" title={notif.message}>
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {relativeTime(notif.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkRead(notif.notification_id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <AlertDialog
                    title="Delete this notification?"
                    description="This cannot be undone."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={() => handleDelete(notif.notification_id)}
                  >
                    <button
                      title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Send tab ──────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES = [
  { value: "info",     label: "Info" },
  { value: "payment",  label: "Payment" },
  { value: "course",   label: "Course" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "pending",  label: "Pending" },
];

const GROUP_PRESETS = [
  { value: "all",      label: "All Students" },
  { value: "pending",  label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "enrolled", label: "Enrolled" },
];

function SendTab() {
  const [recipientMode, setRecipientMode] = useState("single");

  // single-student
  const [userSearch, setUserSearch]       = useState("");
  const [userResults, setUserResults]     = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [showDropdown, setShowDropdown]   = useState(false);

  // group
  const [selectedGroup, setSelectedGroup]     = useState("");
  const [programs, setPrograms]               = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");

  // compose
  const [form, setForm]       = useState({ type: "info", title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);

  // Debounced user search via applications endpoint
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiService.get("/applications/", { search: userSearch, page_size: 8 });
        const items = res.results || res || [];
        const seen = new Set();
        const unique = items.filter((a) => {
          const uid = a.user || a.user_id;
          if (!uid || seen.has(uid)) return false;
          seen.add(uid);
          return true;
        });
        setUserResults(unique);
        setShowDropdown(true);
      } catch {
        setUserResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Load programs for "By Program" select
  useEffect(() => {
    apiService.get("/programs/").then((res) => {
      const list = res.results || res || [];
      setPrograms(list);
    }).catch(() => {});
  }, []);

  const resolvedGroup = recipientMode === "group"
    ? (selectedProgram ? `program:${selectedProgram}` : selectedGroup)
    : null;

  const canSend = form.title.trim() && form.message.trim() && (
    recipientMode === "single" ? !!selectedUser : !!resolvedGroup
  );

  const handleSend = async () => {
    setSending(true);
    try {
      if (recipientMode === "single") {
        const uid = selectedUser.user || selectedUser.user_id;
        const res = await notificationService.createNotification({
          userId: uid,
          type: form.type,
          title: form.title,
          message: form.message,
          link: form.link,
        });
        if (!res.success) throw new Error(res.error || "Failed to send");
        toast.success(`Notification sent to ${selectedUser.full_name}`);
      } else {
        const res = await notificationService.createGroupNotification({
          group: resolvedGroup,
          type: form.type,
          title: form.title,
          message: form.message,
          link: form.link,
        });
        if (!res.success) throw new Error(res.error || "Failed to send");
        const count = res.sent_count ?? 0;
        toast.success(
          count > 0
            ? `Sent to ${count} student${count !== 1 ? "s" : ""}`
            : "No matching students found",
        );
      }
      setSelectedUser(null);
      setUserSearch("");
      setSelectedGroup("");
      setSelectedProgram("");
      setForm({ type: "info", title: "", message: "", link: "" });
    } catch (err) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Recipient mode */}
      <div>
        <p className="text-sm font-medium mb-2">Recipient</p>
        <div className="flex gap-2">
          {[
            { key: "single", label: "Single Student" },
            { key: "group",  label: "Group" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRecipientMode(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                recipientMode === key
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Single student search */}
      {recipientMode === "single" && (
        <div className="relative">
          <p className="text-sm font-medium mb-2">Search student</p>
          {selectedUser ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl w-fit">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {selectedUser.full_name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{selectedUser.full_name}</span>
              <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
              <button
                onClick={() => setSelectedUser(null)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring pr-8"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
              {showDropdown && userResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-card border rounded-xl shadow-lg overflow-hidden">
                  {userResults.map((app) => (
                    <button
                      key={app.user || app.user_id}
                      onClick={() => {
                        setSelectedUser(app);
                        setShowDropdown(false);
                        setUserSearch("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {app.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{app.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && !searchLoading && userResults.length === 0 && userSearch.trim() && (
                <div className="mt-1 px-4 py-3 text-xs text-muted-foreground border rounded-xl">
                  No students found
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Group presets */}
      {recipientMode === "group" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Select group</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_PRESETS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setSelectedGroup(value); setSelectedProgram(""); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedGroup === value && !selectedProgram
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {programs.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Or by program</p>
              <select
                value={selectedProgram}
                onChange={(e) => { setSelectedProgram(e.target.value); setSelectedGroup(""); }}
                className="w-full sm:w-64 px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.program_id} value={p.program}>
                    {p.program_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Compose */}
      <div className="space-y-4 pt-2 border-t border-border">
        <p className="text-sm font-medium">Compose</p>

        {/* Type */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {NOTIFICATION_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, type: value }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  form.type === value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Title</p>
            <p className="text-[10px] text-muted-foreground">{form.title.length}/255</p>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 255) }))}
            placeholder="Notification title"
            className="w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Message */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Message</p>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Notification message…"
            rows={4}
            className="w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Link (optional) */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Link <span className="opacity-50">(optional)</span>
          </p>
          <input
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="/admin/applications"
            className="w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button disabled={!canSend || sending} onClick={handleSend} className="gap-2">
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
          ) : (
            <><Send className="w-4 h-4" /> {recipientMode === "group" ? "Send to group" : "Send notification"}</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform alerts and student messaging
          </p>
        </div>

        {/* Main tabs */}
        <UnderlineTabs
          tabs={[
            { value: "inbox", label: "Inbox" },
            { value: "send",  label: "Send" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "inbox" ? <InboxTab /> : <SendTab />}
      </div>
    </AdminLayout>
  );
};

export default Notifications;
