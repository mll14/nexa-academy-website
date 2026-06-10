import AdminLayout from "./AdminLayout";
import { Badge } from "@/components/ui/badge";
import apiService from "@/services/apiService";
import { Check, X, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { statusText } from "@/lib/utils";
import AlertDialog from "@/components/ui/AlertDialog";
import DetailDrawer from "@/components/admin/DetailDrawer";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { UnderlineTabs } from "@/components/admin/UnderlineTabs";
import { Pagination } from "@/components/admin/Pagination";
import { useState, useEffect } from "react";

const statusConfig = {
  pending:             { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  reviewed:            { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  approved:            { bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected:            { bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  interview_scheduled: { bg: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  interview_completed: { bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  enrolled:            { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

const STATUS_TABS = [
  { value: "all",                 label: "All" },
  { value: "pending",             label: "Pending" },
  { value: "reviewed",            label: "Reviewed" },
  { value: "approved",            label: "Approved" },
  { value: "interview_scheduled", label: "Scheduled" },
  { value: "interview_completed", label: "Completed" },
  { value: "enrolled",            label: "Enrolled" },
  { value: "rejected",            label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "applied_at",    label: "Date Applied" },
  { value: "full_name",     label: "Name" },
  { value: "estimated_fees", label: "Fees" },
];

const ApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [status, setStatus]             = useState("all");
  const [sortBy, setSortBy]             = useState("applied_at");
  const [sortOrder, setSortOrder]       = useState("desc");
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(12);
  const [total, setTotal]               = useState(0);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [activeId, setActiveId]         = useState(null);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.get("/applications/", {
        search:    search || undefined,
        status:    status === "all" ? undefined : status,
        ordering,
        page,
        page_size: pageSize,
      });
      const items = res.results || res;
      setApplications(Array.isArray(items) ? items : []);
      setTotal(res.count ?? (Array.isArray(items) ? items.length : 0));
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, status, ordering, page, pageSize]); // eslint-disable-line

  const updateStatus = async (id, newStatus) => {
    try {
      await apiService.patch(`/applications/${id}/update_status/`, { status: newStatus });
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${total} application${total !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Status tabs */}
        <UnderlineTabs
          tabs={STATUS_TABS}
          active={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />

        {/* Toolbar */}
        <AdminToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by name, email, or program…"
          sortOptions={SORT_OPTIONS}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onApply={() => { setPage(1); load(); }}
          onReset={() => { setSortBy("applied_at"); setSortOrder("desc"); setPage(1); }}
        />

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No applications match your filters.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
            {applications.map((app) => {
              const cfg = statusConfig[app.status] || { bg: "bg-muted text-muted-foreground" };
              return (
                <div key={app.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {(app.full_name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{app.full_name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
                        {statusText(app.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {app.email} · {app.program_name}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
                    {app.estimated_fees && (
                      <p className="text-xs font-semibold text-foreground">
                        KSh {app.estimated_fees.toLocaleString("en-KE")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {app.applied_at
                        ? new Date(app.applied_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setActiveId(app.id); setDrawerOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="View details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {!["approved", "enrolled", "rejected"].includes(app.status) && (
                      <AlertDialog
                        title="Approve this application?"
                        description="The applicant will be notified."
                        confirmLabel="Approve"
                        cancelLabel="Cancel"
                        onConfirm={async () => {
                          const res = await updateStatus(app.id, "approved");
                          if (!res.success) throw new Error(res.error || "Failed");
                          toast.success("Application approved");
                        }}
                      >
                        <button className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Approve">
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                      </AlertDialog>
                    )}
                    {!["rejected", "enrolled"].includes(app.status) && (
                      <AlertDialog
                        title="Reject this application?"
                        description="This action cannot be undone."
                        confirmLabel="Reject"
                        cancelLabel="Cancel"
                        onConfirm={async () => {
                          const res = await updateStatus(app.id, "rejected");
                          if (!res.success) throw new Error(res.error || "Failed");
                          toast.success("Application rejected");
                        }}
                      >
                        <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Reject">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          label="applications"
        />
      </div>

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} itemId={activeId} />
    </AdminLayout>
  );
};

export default ApplicationsList;
