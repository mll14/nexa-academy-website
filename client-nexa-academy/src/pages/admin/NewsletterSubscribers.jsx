import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Mail } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import apiService from "../../services/apiService";

const SORT_OPTIONS = [
  { value: "subscribed_at", label: "Date Subscribed" },
  { value: "email",         label: "Email" },
];

const NewsletterSubscribers = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [sortBy, setSortBy]           = useState("subscribed_at");
  const [sortOrder, setSortOrder]     = useState("desc");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(20);
  const [total, setTotal]             = useState(0);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { search: search || undefined, ordering, page, page_size: pageSize };
      const data = await apiService.get("/newsletter/", params);
      const items = Array.isArray(data) ? data : data?.results || [];
      setSubscribers(items);
      setTotal(data.count ?? items.length);
    } catch {
      setError("Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, ordering, page, pageSize]); // eslint-disable-line

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${subscribers.length} subscriber${subscribers.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <AdminToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by email…"
          sortOptions={SORT_OPTIONS}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onApply={() => { setPage(1); load(); }}
          onReset={() => { setSortBy("subscribed_at"); setSortOrder("desc"); setPage(1); }}
        />

        {loading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">{error}</div>
        )}

        <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
          {subscribers.map((sub, i) => (
            <div key={sub.id ?? i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-medium flex-1">{sub.email}</p>
              <p className="text-xs text-muted-foreground">
                {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
          ))}
          {!loading && !subscribers.length && (
            <div className="text-center py-14 space-y-2">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No subscribers yet.</p>
            </div>
          )}
        </div>

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          label="subscribers"
        />
      </div>
    </AdminLayout>
  );
};

export default NewsletterSubscribers;
