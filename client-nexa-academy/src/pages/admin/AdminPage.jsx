import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusText } from "@/lib/utils";
import apiService from "../../services/apiService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  MessageSquare,
  CreditCard,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const statusConfig = {
  enrolled:            { label: "Enrolled",             bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  approved:            { label: "Approved",             bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending:             { label: "Pending",              bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  rejected:            { label: "Rejected",             bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  interview_scheduled: { label: "Interview Scheduled", bg: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  interview_completed: { label: "Interview Completed", bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  reviewed:            { label: "Reviewed",             bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

const AdminPage = () => {
  const [backfilling, setBackfilling] = useState(false);
  const [stats, setStats] = useState({ applications: 0, messages: 0, revenue: 0, enrolled: 0 });
  const [loading, setLoading] = useState(true);
  const [recentApps, setRecentApps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [appStats, contactsRes, paymentsRes, recentRes] = await Promise.all([
          apiService.get("/applications/stats/"),
          apiService.get("/messages/"),
          apiService.get("/payments/?limit=1000"),
          apiService.get("/applications/", { limit: 8, ordering: "-applied_at" }),
        ]);

        const payments = paymentsRes.results || paymentsRes || [];
        const revenue = payments
          .filter((p) => ["completed", "paid", "success"].includes(p.status))
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        setStats({
          applications: appStats?.total ?? appStats?.count ?? 0,
          messages: contactsRes?.count ?? contactsRes?.length ?? 0,
          revenue,
          enrolled: appStats?.enrolled ?? appStats?.enrolled_count ?? 0,
        });

        const apps = recentRes.results || recentRes || [];
        setRecentApps(Array.isArray(apps) ? apps : []);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    {
      label: "Total Applications",
      value: stats.applications,
      icon: Users,
      accent: "text-blue-600",
      ring: "ring-blue-100 dark:ring-blue-900/30",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      href: "/admin/applications",
    },
    {
      label: "Unread Messages",
      value: stats.messages,
      icon: MessageSquare,
      accent: "text-orange-500",
      ring: "ring-orange-100 dark:ring-orange-900/30",
      iconBg: "bg-orange-50 dark:bg-orange-900/20",
      href: "/admin/messages",
    },
    {
      label: "Revenue (KSh)",
      value: stats.revenue.toLocaleString("en-KE"),
      icon: CreditCard,
      accent: "text-emerald-600",
      ring: "ring-emerald-100 dark:ring-emerald-900/30",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      href: "/admin/transactions",
    },
    {
      label: "Enrolled Students",
      value: stats.enrolled,
      icon: BookOpen,
      accent: "text-violet-600",
      ring: "ring-violet-100 dark:ring-violet-900/30",
      iconBg: "bg-violet-50 dark:bg-violet-900/20",
      href: "/admin/applications?status=enrolled",
    },
  ];

  const pendingCount = recentApps.filter((a) => a.status === "pending").length;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={() => navigate("/admin/applications")}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium hover:bg-amber-100 transition-colors dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
            >
              <AlertCircle className="w-4 h-4" />
              {pendingCount} pending review
            </button>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, accent, ring, iconBg, href }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`
                text-left bg-card border rounded-2xl p-5 space-y-4 ring-1 ${ring}
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group
              `}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-4 h-4 ${accent}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {loading ? (
                    <span className="inline-block w-12 h-7 bg-muted rounded animate-pulse" />
                  ) : value}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick actions row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/admin/applications")}
            className="flex items-center gap-3 px-4 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Users className="w-4 h-4" />
            <span className="flex-1 text-left">Review Applications</span>
            <ArrowRight className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={() => navigate("/admin/interviews")}
            className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Manage Interviews</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/admin/enroll")}
            className="flex items-center gap-3 px-4 py-3.5 bg-card border rounded-xl font-medium text-sm text-foreground hover:bg-muted transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-left">Enroll Student</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Recent applications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Recent Applications
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/applications")}
              className="text-primary hover:text-primary hover:bg-primary/8 gap-1.5 text-sm"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No applications yet.
            </div>
          ) : (
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
              {recentApps.map((app) => {
                const userId = app.user || app.user_id || app.user_uuid;
                const cfg = statusConfig[app.status] || { label: statusText(app.status), bg: "bg-muted text-muted-foreground" };
                return (
                  <div
                    key={app.id}
                    onClick={() => userId && navigate(`/admin/students/${userId}`)}
                    className={`flex items-center gap-4 px-5 py-3.5 ${userId ? "cursor-pointer hover:bg-muted/40" : ""} transition-colors`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {(app.full_name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.program_name}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {app.applied_at
                          ? new Date(app.applied_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
                          : "—"}
                      </span>
                      {!userId && (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                          No account
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Backfill */}
        <div className="flex items-center gap-4 p-4 bg-muted/40 border rounded-2xl">
          <div className="flex-1">
            <p className="text-sm font-medium">Backfill Enrollments</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marks any student who has already paid KSh 10,000 as enrolled, in case they were missed.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={backfilling}
            onClick={async () => {
              setBackfilling(true);
              try {
                const res = await apiService.post("/payments/backfill_enrollments/");
                const count = res?.enrolled_count ?? 0;
                toast.success(
                  count > 0
                    ? `Enrolled ${count} student${count !== 1 ? "s" : ""}`
                    : "No pending enrollments found",
                );
              } catch (err) {
                toast.error(err?.message || "Backfill failed");
              } finally {
                setBackfilling(false);
              }
            }}
          >
            {backfilling ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</> : "Run Backfill"}
          </Button>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminPage;
