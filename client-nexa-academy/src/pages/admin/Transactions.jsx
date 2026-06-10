import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { statusText } from "@/lib/utils";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { UnderlineTabs } from "@/components/admin/UnderlineTabs";
import apiService from "../../services/apiService";
import paymentService from "../../services/paymentService";
import toast from "react-hot-toast";

const statusConfig = {
  paid: { bg: "bg-green-100 text-green-700" },
  completed: { bg: "bg-green-100 text-green-700" },
  pending: { bg: "bg-amber-100 text-amber-700" },
  failed: { bg: "bg-red-100 text-red-700" },
  refunded: { bg: "bg-gray-100 text-gray-600" },
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const SORT_OPTIONS = [
  { value: "payment_date", label: "Date" },
  { value: "amount", label: "Amount" },
];

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("payment_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [checkingId, setCheckingId] = useState(null);
  const [bulkChecking, setBulkChecking] = useState(false);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        search: search || undefined,
        ordering,
        page,
        page_size: pageSize,
      };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await apiService.get("/payments/", params);
      const items = Array.isArray(data) ? data : data?.results || [];
      setTransactions(items);
      setTotal(data.count ?? items.length);
    } catch {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, statusFilter, ordering, page, pageSize]); // eslint-disable-line

  const handleCheckOne = async (tx) => {
    const id = tx.payment_id || tx.id;
    setCheckingId(id);
    const result = await paymentService.checkPaymentStatus(id);
    setCheckingId(null);
    if (!result.success) {
      toast.error(result.error || "Failed to check payment");
      return;
    }
    const updated = result.data?.payment;
    const ps = result.data?.paystack_status;
    if (updated?.status === "completed") {
      toast.success(`Payment ${tx.payment_reference} confirmed as completed`);
    } else if (updated?.status === "failed") {
      toast.error(`Payment ${tx.payment_reference} confirmed as failed`);
    } else {
      toast(`Still ${ps || "pending"} on Paystack`);
    }
    load();
  };

  const handleCheckAllPending = async () => {
    setBulkChecking(true);
    const result = await paymentService.checkAllPending();
    setBulkChecking(false);
    if (!result.success) {
      toast.error(result.error || "Bulk check failed");
      return;
    }
    const {
      completed = [],
      failed = [],
      still_pending = [],
      errors = [],
    } = result.data;
    const parts = [];
    if (completed.length) parts.push(`${completed.length} completed`);
    if (failed.length) parts.push(`${failed.length} failed`);
    if (still_pending.length)
      parts.push(`${still_pending.length} still pending`);
    if (errors.length) parts.push(`${errors.length} errors`);
    toast(parts.length ? parts.join(", ") : "No pending payments found");
    load();
  };

  const collectedTotal = transactions
    .filter((t) => ["paid", "completed"].includes(t.status))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading
                ? "Loading…"
                : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && collectedTotal > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm">
                <span className="text-muted-foreground">Total collected: </span>
                <span className="font-bold">
                  KSh {Number(collectedTotal).toLocaleString("en-KE")}
                </span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={bulkChecking}
              onClick={handleCheckAllPending}
              className="gap-1.5 rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${bulkChecking ? "animate-spin" : ""}`}
              />
              {bulkChecking ? "Checking…" : "Check All Pending"}
            </Button>
          </div>
        </div>

        <UnderlineTabs
          tabs={STATUS_TABS}
          active={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />

        <AdminToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search by student name or email…"
          sortOptions={SORT_OPTIONS}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onApply={() => {
            setPage(1);
            load();
          }}
          onReset={() => {
            setSortBy("payment_date");
            setSortOrder("desc");
            setPage(1);
          }}
        />

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-muted rounded-xl animate-pulse"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
            {error}
          </div>
        )}

        <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
          {transactions.map((tx) => {
            const cfg = statusConfig[tx.status] || {
              bg: "bg-muted text-muted-foreground",
            };
            const txId = tx.payment_id || tx.id;
            const isChecking = checkingId === txId;
            return (
              <div
                key={txId}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {tx.student_uid ? (
                    <Link
                      to={`/admin/students/${tx.student_uid}`}
                      className="text-sm font-semibold truncate hover:underline flex items-center gap-1 w-fit"
                    >
                      {tx.student_name || tx.student_email}
                      <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold truncate">
                      {tx.student_name || tx.student_email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.program_name || tx.program || "—"} · {tx.payment_method || tx.method || "N/A"}
                    {tx.payment_reference ? ` · ${tx.payment_reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-semibold">
                    KSh {Number(tx.amount || 0).toLocaleString("en-KE")}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}
                  >
                    {statusText(tx.status)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(
                      tx.payment_date || tx.created_at || Date.now(),
                    ).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {tx.status === "pending" && tx.payment_reference && (
                    <button
                      onClick={() => handleCheckOne(tx)}
                      disabled={isChecking}
                      title="Check Paystack for payment outcome"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
                      />
                      <span className="hidden sm:inline">
                        {isChecking ? "Checking…" : "Check"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && !transactions.length && (
            <div className="text-center py-14 space-y-2">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No transactions found.
              </p>
            </div>
          )}
        </div>

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          label="transactions"
        />
      </div>
    </AdminLayout>
  );
};

export default Transactions;
