import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import StudentLayout from "./StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setSeoData } from "../../utils/seoUtils";
import { useAuth } from "@/context/AuthContext";
import apiService from "@/services/apiService";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
} from "lucide-react";
import { useInterval } from "@/hooks/useInterval";
import ProcessTracker, {
  getProcessProgress,
} from "@/components/student/ProcessTracker";
import { Button } from "@/components/ui/button";
import { statusText } from "@/lib/utils";
import notificationService from "@/services/notificationService";
import PaymentTab from "@/pages/student-dashboard/PaymentTab";
import contentService from "@/services/contentService";

const StudentDashboard = () => {
  const { uid } = useParams();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("tracker");
  const [enrollment, setEnrollment] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [application, setApplication] = useState(null);
  const [interviewSlot, setInterviewSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return ts;
    }
  };

  useEffect(() => setSeoData("dashboard"), [uid]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const profile = await apiService.get("/auth/profile/");
      setProfile(profile);
      const notifs = await apiService.get("/notifications/?limit=10");
      const paymentsRes = await apiService.get("/payments/");

      // fetch latest application for this user (by email)
      let app = null;
      try {
        if (profile?.email) {
          const appsRes = await apiService.get("/applications/", {
            email: profile.email,
            ordering: "-applied_at",
            limit: 1,
          });
          const apps = appsRes.results || appsRes || [];
          app = Array.isArray(apps) ? apps[0] : apps;
          if (app && app.id) {
            // fetch full detail to get interview_slot and estimated fees
            try {
              const detail = await apiService.get(`/applications/${app.id}/`);
              setApplication(detail || app || null);
              setInterviewSlot(
                detail.interview_slot || app.interview_slot || null,
              );
            } catch (err) {
              // fallback to summary
              console.error(err);
              setApplication(app || null);
              setInterviewSlot(app.interview_slot || null);
            }
          } else {
            setApplication(app || null);
            setInterviewSlot(null);
          }
        }
      } catch (err) {
        console.warn("Failed to load application", err);
      }

      const firstEnrollment =
        (profile.courses_enrolled && profile.courses_enrolled[0]) || null;
      if (firstEnrollment) {
        setEnrollment({
          programName:
            firstEnrollment.program_name || firstEnrollment.title || "",
          programId:
            firstEnrollment.program ||
            firstEnrollment.program_id ||
            firstEnrollment.program_name ||
            null,
          startDate: firstEnrollment.start_date || null,
          endDate: firstEnrollment.end_date || null,
          progress: firstEnrollment.progress || 0,
          status: firstEnrollment.status || "pending",
          paymentStatus: firstEnrollment.payment_status || "pending",
          // canonical fields used by PaymentTab: amount, amountPaid, balance
          amount:
            firstEnrollment.amount ||
            profile.program_fee ||
            profile.fee_balance ||
            0,
          amountPaid:
            firstEnrollment.amount_paid ||
            firstEnrollment.amountPaid ||
            profile.total_fee_paid ||
            0,
          balance:
            typeof firstEnrollment.balance !== "undefined"
              ? firstEnrollment.balance
              : typeof profile.fee_balance !== "undefined"
                ? profile.fee_balance
                : (firstEnrollment.amount || 0) -
                  (firstEnrollment.amount_paid || 0),
        });
      } else setEnrollment(null);

      setNotifications(notifs.results || notifs || []);
      const announcementsRes = await contentService.getAnnouncements();
      setAnnouncements(announcementsRes.announcements || []);
      const paymentsList = paymentsRes.results || paymentsRes || [];
      setPayments(paymentsList);

      // Use backend-computed totals as the source of truth.
      // User.total_fee_paid and User.fee_balance are updated atomically only
      // when a payment is verified as completed — never from pending payments.
      try {
        const backendAmountPaid = Number(
          profile.total_fee_paid ?? profile.totalFeePaid ?? 0,
        );

        if (firstEnrollment) {
          setEnrollment((prev) => {
            const amount = prev?.amount || 0;
            const amountPaid = backendAmountPaid;
            const balance = Math.max(0, amount - amountPaid);
            return { ...prev, amountPaid, balance };
          });
        } else if (app) {
          const amount =
            Number((app.estimated_fees || app.estimatedFees) || 0) || 0;
          const amountPaid = backendAmountPaid;
          const balance = Math.max(0, amount - amountPaid);
          setEnrollment({
            programName: (app.program_name || app.program) || "",
            programId: (app.program || app.program_name) || null,
            startDate: null,
            endDate: null,
            progress: 0,
            status: app.status || "pending",
            paymentStatus: balance <= 0 ? "paid" : "pending",
            amount,
            amountPaid,
            balance,
          });
        }
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      console.error("Dashboard load error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [uid]);

  // poll every 30s
  useInterval(() => {
    loadDashboard();
  }, 30_000);

  // Reset to tracker tab if transactions tab becomes inaccessible
  useEffect(() => {
    if (
      activeTab === "transactions" &&
      !["interview_completed", "enrolled"].includes(application?.status)
    ) {
      setActiveTab("tracker");
    }
  }, [application?.status, activeTab]);

  // (notifications UI handled elsewhere)

  if (loading) {
    return (
      <StudentLayout>
        <div className="min-h-48 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  const paymentUnlocked = ["interview_completed", "enrolled"].includes(
    application?.status,
  );
  const tabs = paymentUnlocked
    ? ["tracker", "transactions", "notifications"]
    : ["tracker", "notifications"];

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome,{" "}
            {currentUser?.displayName ||
              currentUser?.email?.split("@")[0] ||
              "Student"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's your learning overview
          </p>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map(ann => (
              <div
                key={ann.id}
                className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold">{ann.title}</p>
                  {ann.body && (
                    <p className="text-xs text-muted-foreground mt-0.5">{ann.body}</p>
                  )}
                </div>
                <button
                  onClick={() => setAnnouncements(prev => prev.filter(a => a.id !== ann.id))}
                  className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Program",
              value:
                (enrollment?.programName &&
                  enrollment.programName.split(" ").slice(0, 2).join(" ")) ||
                application?.program_name ||
                profile?.program_name ||
                "—",
              icon: BookOpen,
            },
            {
              label: "Status",
              value:
                !application && !enrollment
                  ? "—"
                  : enrollment?.status === "enrolled"
                    ? "Active"
                    : statusText(
                        enrollment?.status || application?.status || "pending",
                      ),
              icon: CheckCircle2,
            },
            {
              label: "Progress",
              value: (() => {
                // Prefer application process progress if available
                const procPct = application?.status
                  ? getProcessProgress(application.status)
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
              value: (() => {
                if (!application && !enrollment) return "—";
                const bal = Number(enrollment?.balance ?? 0);
                if (isNaN(bal)) return enrollment?.paymentStatus || "Pending";
                return bal <= 0 ? "Paid" : `KSh ${bal.toLocaleString()}`;
              })(),
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="inline-flex gap-1 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize rounded-xl border border-border px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Overview tab commented out */}

        {/* Application tab commented out */}

        {activeTab === "tracker" && (
          <div className="space-y-4">
            <Card className="border rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold">Process Tracker</h2>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Track your application progress and interview scheduling here.
                </p>
                <div className="mt-4">
                  <ProcessTracker
                    currentStatus={application?.status}
                    applicationId={application?.id}
                    interviewSlot={interviewSlot}
                    onScheduled={(res) => {
                      setInterviewSlot(res);
                      setApplication((a) => ({
                        ...a,
                        status: "interview_scheduled",
                      }));
                    }}
                    onRequestPayment={() => setActiveTab("transactions")}
                    depositedAmount={Number(
                      profile?.total_fee_paid ?? profile?.totalFeePaid ?? 0,
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            <Card className="border rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Notifications</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await notificationService.markAllAsRead();
                          setNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true })),
                          );
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      Mark all read
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-lg border ${n.read ? "bg-background" : "bg-muted/5 border-l-4 border-primary"}`}
                      >
                        <div className="font-medium">{n.title}</div>
                        {n.message && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {n.message}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          {formatTimestamp(n.timestamp || n.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Messages tab commented out */}

        {activeTab === "transactions" && paymentUnlocked && (
          <PaymentTab
            enrollment={enrollment}
            payments={payments}
            onPaymentDone={loadDashboard}
            applicationStatus={application?.status}
            depositedAmount={Number(
              profile?.total_fee_paid ?? profile?.totalFeePaid ?? 0,
            )}
          />
        )}

        {/* Newsletter tab commented out */}
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
