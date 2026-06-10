import { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Mail, User, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { UnderlineTabs } from "@/components/admin/UnderlineTabs";
import apiService from "../../services/apiService";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "created_at", label: "Date" },
  { value: "name",       label: "Name" },
  { value: "email",      label: "Email" },
];

const ExpressInterestAdmin = () => {
  const [data, setData]             = useState({ results: [], count: 0, program_counts: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [sortBy, setSortBy]         = useState("created_at");
  const [sortOrder, setSortOrder]   = useState("desc");
  const [page, setPage]             = useState(1);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ordering,
        ...(search ? { search } : {}),
        ...(programFilter ? { program_slug: programFilter } : {}),
      };
      const res = await apiService.get("/programs/program-interests/", params);
      setData(res);
    } catch {
      setError("Failed to load interest submissions.");
    } finally {
      setLoading(false);
    }
  }, [page, search, programFilter, ordering]);

  useEffect(() => { setPage(1); }, [search, programFilter]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const programs   = data.program_counts || [];

  // Build underline tabs from program_counts
  const programTabs = [
    { value: "", label: "All programs" },
    ...programs.map((p) => ({
      value: p.program_slug,
      label: `${p.program_name || p.program_slug}`,
      count: p.count,
    })),
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Express Interest
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Students who expressed interest in upcoming programs
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="bg-card border rounded-2xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Total submissions</p>
            <p className="text-2xl font-bold text-primary">{data.count}</p>
          </div>
          {programs.map((p) => (
            <div key={p.program_slug} className="bg-card border rounded-2xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground truncate">{p.program_name || p.program_slug}</p>
              <p className="text-2xl font-bold">{p.count}</p>
            </div>
          ))}
        </div>

        {/* Program tabs */}
        {programTabs.length > 1 && (
          <UnderlineTabs
            tabs={programTabs}
            active={programFilter}
            onChange={(v) => setProgramFilter(v)}
          />
        )}

        {/* Toolbar */}
        <AdminToolbar
          search={search}
          onSearchChange={(v) => setSearch(v)}
          searchPlaceholder="Search by name or email…"
          sortOptions={SORT_OPTIONS}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onApply={() => { setPage(1); load(); }}
          onReset={() => { setSortBy("created_at"); setSortOrder("desc"); setPage(1); }}
        />

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">{error}</div>
        )}

        <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
          {!loading && data.results.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Flame className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            </div>
          )}

          {data.results.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {(item.name || item.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">
                      {item.name || <span className="text-muted-foreground italic">Anonymous</span>}
                    </p>
                    <a href={`mailto:${item.email}`} className="text-xs text-primary hover:underline">
                      {item.email}
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {item.program_name || item.program_slug || "Unknown"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                {item.message && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">{item.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1.5 rounded-xl">
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1.5 rounded-xl">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExpressInterestAdmin;
