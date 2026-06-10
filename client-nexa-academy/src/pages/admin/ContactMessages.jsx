import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageSquare } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { UnderlineTabs } from "@/components/admin/UnderlineTabs";
import apiService from "../../services/apiService";

const READ_TABS = [
  { value: "all",   label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read",   label: "Read" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Date" },
  { value: "name",       label: "Name" },
];

const ContactMessages = () => {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [sortBy, setSortBy]       = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [total, setTotal]         = useState(0);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        search:    search || undefined,
        ordering,
        page,
        page_size: pageSize,
      };
      if (readFilter === "read")   params.read = true;
      if (readFilter === "unread") params.read = false;
      const data = await apiService.get("/messages/", params);
      const items = Array.isArray(data) ? data : data?.results || [];
      setMessages(items);
      setTotal(data.count ?? items.length);
    } catch {
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, readFilter, ordering, page, pageSize]); // eslint-disable-line

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Contact Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <UnderlineTabs tabs={READ_TABS} active={readFilter} onChange={(v) => { setReadFilter(v); setPage(1); }} />

        <AdminToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search messages…"
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
            {error} <button onClick={load} className="underline ml-2">Retry</button>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className="border rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm">{msg.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {msg.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.read === false && (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">New</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at || Date.now()).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                {msg.subject && <p className="text-sm font-medium">{msg.subject}</p>}
                <Separator />
                <p className="text-sm text-muted-foreground leading-relaxed">{msg.message}</p>
              </CardContent>
            </Card>
          ))}

          {!loading && !messages.length && (
            <div className="text-center py-14 space-y-2">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No messages found.</p>
            </div>
          )}
        </div>

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          label="messages"
        />
      </div>
    </AdminLayout>
  );
};

export default ContactMessages;
