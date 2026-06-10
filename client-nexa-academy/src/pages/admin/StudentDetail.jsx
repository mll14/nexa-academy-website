import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { getProcessProgress } from "@/components/student/ProcessTracker";
import { statusText } from "@/lib/utils";
import apiService from "@/services/apiService";
import ProcessTracker from "@/components/student/ProcessTracker";
import DepositProgress from "@/components/shared/DepositProgress";

const statusColor = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  enrolled: "bg-blue-100 text-blue-700",
};

export default function StudentDetail() {
  const { uid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("applications");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiService.get(`/auth/students/${uid}/`);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [uid]);

  if (loading)
    return (
      <AdminLayout>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminLayout>
    );
  if (!data)
    return (
      <AdminLayout>
        <p className="text-sm text-destructive">Student not found.</p>
      </AdminLayout>
    );

  const { user, applications, payments, enrollments } = data;

  const paymentsList = payments || [];

  // Backend is source of truth for paid amounts.
  // Enrollment.amount_paid and User.total_fee_paid are only updated when
  // verify_payment confirms a completed transaction.
  const enrollment = (() => {
    const firstEnrollment = (enrollments && enrollments[0]) || null;

    if (firstEnrollment) {
      // Parse to Number before || — "0.00" is a truthy string in JS so
      // `"0.00" || user.total_fee_paid` would never reach the fallback.
      const amount = Number(firstEnrollment.amount) || Number(user.program_fee) || 0;
      const enrollmentPaid =
        Number(firstEnrollment.amount_paid) || Number(firstEnrollment.amountPaid) || 0;
      const amountPaid = enrollmentPaid > 0
        ? enrollmentPaid
        : Number(user.total_fee_paid) || 0;
      const balance = Math.max(0, amount - amountPaid);

      return {
        programName: firstEnrollment.program_name || firstEnrollment.title || "",
        startDate: firstEnrollment.start_date || null,
        endDate: firstEnrollment.end_date || null,
        progress: firstEnrollment.progress || 0,
        status: firstEnrollment.status || "pending",
        paymentStatus: firstEnrollment.payment_status || (balance <= 0 ? "paid" : "pending"),
        amount,
        amountPaid,
        balance,
      };
    }

    // No Enrollment yet — derive total from User.total_fee_paid (backend aggregate).
    const latestApp = (applications && applications[0]) || null;
    if (latestApp) {
      const amount = Number(latestApp.estimated_fees || latestApp.estimatedFees || 0);
      const amountPaid = Number(user.total_fee_paid ?? 0);
      const balance = Math.max(0, amount - amountPaid);
      return {
        programName: latestApp.program_name || latestApp.program || "",
        startDate: null,
        endDate: null,
        progress: 0,
        status: latestApp.status || "pending",
        paymentStatus: balance <= 0 ? "paid" : "pending",
        amount,
        amountPaid,
        balance,
      };
    }

    return null;
  })();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {user.display_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.display_name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.email} · {user.phone}
            </p>
            <div className="flex gap-2 mt-1">
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {user.role}
              </Badge>
              <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                {statusText(user.status)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Student summary cards similar to StudentDashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Program",
              value: enrollment?.programName || "—",
              icon: BookOpen,
            },
            {
              label: "Status",
              value:
                enrollment?.status === "enrolled"
                  ? "Active"
                  : statusText(enrollment?.status),
              icon: CheckCircle2,
            },
            {
              label: "Progress",
              value: (() => {
                // Prefer application-based process percent when available
                const appStatus =
                  (applications && applications[0]?.status) || null;
                const procPct = appStatus
                  ? getProcessProgress(appStatus)
                  : null;
                if (typeof procPct === "number" && procPct > 0)
                  return `${procPct}%`;

                const prog = enrollment?.progress;
                if (typeof prog === "number") return `${prog}%`;
                const amt = Number(enrollment?.amount || 0);
                const paid = Number(enrollment?.amountPaid || 0);
                const pct = amt > 0 ? Math.round((paid / amt) * 100) : 0;
                return `${pct}%`;
              })(),
              icon: Clock,
            },
            {
              label: "Payment",
              value: `KSh ${Number(enrollment?.amountPaid ?? 0).toLocaleString()}`,
              icon: CreditCard,
            },
          ].map(({ label, value, icon: StatIcon }) => {
            const StatIconComp = StatIcon;
            return (
              <Card key={label} className="border rounded-2xl">
                <CardContent className="p-4 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <StatIconComp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="inline-flex gap-1 bg-transparent p-0">
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "applications" && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications.</p>
            ) : (
              <>
                {/* Process tracker for the latest application */}
                {applications[0] && (
                  <Card className="border rounded-2xl">
                    <CardContent className="p-6 space-y-4">
                      <h2 className="font-semibold">Process Tracker</h2>
                      <Separator />
                      <p className="text-sm text-muted-foreground">
                        Track this applicant's progress and interview
                        scheduling.
                      </p>
                      <div className="mt-4">
                        <ProcessTracker
                          currentStatus={applications[0].status}
                          applicationId={applications[0].id}
                          interviewSlot={
                            applications[0].interview_slot ||
                            applications[0].interviewSlot ||
                            null
                          }
                          onScheduled={async () => {
                            try {
                              const detail = await apiService.get(
                                `/applications/${applications[0].id}/`,
                              );
                              setData((prev) => ({
                                ...prev,
                                applications: [
                                  detail,
                                  ...(prev.applications || []).slice(1),
                                ],
                              }));
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          onRequestPayment={() => setTab("payments")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {applications.map((app) => (
                  <Card key={app.id} className="border rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{app.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {app.program_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              statusColor[app.status] ??
                              "bg-muted text-muted-foreground"
                            }
                          >
                            {statusText(app.status)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "payments" && (
          <div className="space-y-3">
            {/* Deposit / balance progress — uses backend Enrollment.amount_paid
                which is updated only on verified payment completion. */}
            {(() => {
              const appStatus = (applications && applications[0]?.status) || null;
              return (
                <DepositProgress
                  depositedAmount={Number(enrollment?.amountPaid ?? 0)}
                  applicationStatus={appStatus}
                  totalFee={Number(enrollment?.amount ?? 0)}
                />
              );
            })()}

            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments.</p>
            ) : (
              payments.map((p) => (
                <Card key={p.payment_id || p.id} className="border rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        KSh {parseFloat(p.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          p.payment_date || p.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        p.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {statusText(p.status)}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "enrollments" && (
          <div className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments.</p>
            ) : (
              enrollments.map((e) => (
                <Card
                  key={e.enrollment_id || e.id}
                  className="border rounded-2xl"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{e.program_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {statusText(e.status)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        KSh {parseFloat(e.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: KSh{" "}
                        {parseFloat(e.balance || 0).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
