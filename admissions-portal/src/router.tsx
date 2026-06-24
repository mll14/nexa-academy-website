import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { tokens, getStoredUser } from "./lib/auth";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Apply } from "./pages/Apply";
import { Unsubscribe } from "./pages/Unsubscribe";
import { StudentApplication, StudentDashboard, StudentNotifications, StudentPayments } from "./pages/student/Dashboard";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { Applications } from "./pages/admin/Applications";
import { ApplicationDetail } from "./pages/admin/ApplicationDetail";
import { Interviews } from "./pages/admin/Interviews";
import { Transactions } from "./pages/admin/Transactions";
import { PaymentPlanRequests } from "./pages/admin/PaymentPlanRequests";
import { Programs } from "./pages/admin/Programs";
import { Messages } from "./pages/admin/Messages";
import { EnrolledStudents } from "./pages/admin/EnrolledStudents";
import { Leads } from "./pages/admin/Leads";
import { LeadDetail } from "./pages/admin/LeadDetail";
import { StudentDetail } from "./pages/admin/StudentDetail";
import { Notifications } from "./pages/admin/Notifications"
import { Newsletter } from "./pages/admin/Newsletter";
import { Appointments } from "./pages/admin/Appointments";
import { AppointmentDetail } from "./pages/admin/AppointmentDetail";

// ─── Root ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: () => <Outlet /> });

// ─── Public routes ───────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const user = getStoredUser();
    if (!user) throw redirect({ to: "/login" });
    if (user.role === "admin") throw redirect({ to: "/admin" });
    throw redirect({ to: "/student/dashboard" });
  },
  component: () => null,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: () => {
    const user = getStoredUser();
    if (user?.role === "admin") throw redirect({ to: "/admin" });
    if (user?.role === "student") throw redirect({ to: "/student/dashboard" });
  },
  component: Login,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: (s: Record<string, unknown>) => ({
    uid: typeof s.uid === "string" ? s.uid : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: ResetPassword,
});

const applyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/apply",
  validateSearch: (s: Record<string, unknown>) => ({
    program: typeof s.program === "string" ? s.program : undefined,
  }),
  component: Apply,
});

const unsubscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unsubscribe",
  validateSearch: (s: Record<string, unknown>) => ({
    status: s.status === "error" ? "error" : "success",
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
  component: Unsubscribe,
});

// ─── Student layout — /student/* ─────────────────────────────────────────────

const studentLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student",
  beforeLoad: () => {
    if (!tokens.access) throw redirect({ to: "/login" });
    const user = getStoredUser();
    if (user?.role === "admin") throw redirect({ to: "/admin" });
  },
  component: () => <Outlet />,
});

const studentDashboardRoute = createRoute({
  getParentRoute: () => studentLayoutRoute,
  path: "dashboard",
  component: StudentDashboard,
});

const studentApplicationRoute = createRoute({
  getParentRoute: () => studentLayoutRoute,
  path: "application",
  component: StudentApplication,
});

const studentPaymentsRoute = createRoute({
  getParentRoute: () => studentLayoutRoute,
  path: "payments",
  component: StudentPayments,
});

const studentNotificationsRoute = createRoute({
  getParentRoute: () => studentLayoutRoute,
  path: "notifications",
  component: StudentNotifications,
});

// ─── Admin layout — /admin/* ─────────────────────────────────────────────────

const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    if (!tokens.access) throw redirect({ to: "/login" });
    const user = getStoredUser();
    if (user && user.role !== "admin") throw redirect({ to: "/login" });
  },
  component: () => <Outlet />,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/",
  component: AdminDashboard,
});

const adminApplicationsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "applications",
  component: Applications,
});

const adminApplicationDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "applications/$id",
  component: ApplicationDetail,
});

const adminInterviewsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "interviews",
  component: Interviews,
});

const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "transactions",
  component: Transactions,
});

const adminPaymentPlansRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "payment-plans",
  component: PaymentPlanRequests,
});

const adminProgramsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "programs",
  component: Programs,
});

const adminIntakesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "intakes",
  beforeLoad: () => { throw redirect({ to: '/admin/programs' }) },
  component: () => null,
});

const adminLeadsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "leads",
  component: Leads,
});

const adminLeadDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "leads/$leadType/$id",
  component: LeadDetail,
});

const adminEnrolledRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "enrolled",
  component: EnrolledStudents,
});

const adminMessagesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "messages",
  component: Messages,
});

const adminStudentDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "students/$uid",
  component: StudentDetail,
});

const adminNotificationsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "notifications",
  component: Notifications,
});

const adminNewsletterRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "newsletter",
  component: Newsletter,
});

const adminAppointmentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "appointments",
  component: Appointments,
});

const adminAppointmentDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "appointments/$id",
  component: AppointmentDetail,
});

// ─── Route tree ──────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  applyRoute,
  unsubscribeRoute,
  studentLayoutRoute.addChildren([
    studentDashboardRoute,
    studentApplicationRoute,
    studentPaymentsRoute,
    studentNotificationsRoute,
  ]),
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminApplicationsRoute,
    adminApplicationDetailRoute,
    adminInterviewsRoute,
    adminTransactionsRoute,
    adminPaymentPlansRoute,
    adminProgramsRoute,
    adminIntakesRoute,
    adminLeadsRoute,
    adminLeadDetailRoute,
    adminEnrolledRoute,
    adminMessagesRoute,
    adminStudentDetailRoute,
    adminNotificationsRoute,
    adminNewsletterRoute,
    adminAppointmentsRoute,
    adminAppointmentDetailRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
