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
import { Payments } from "./pages/admin/Payments";
import { Programs } from "./pages/admin/Programs";
import { Messages } from "./pages/admin/Messages";
import { EnrolledStudents } from "./pages/admin/EnrolledStudents";
import { EnrolledStudentDetail } from "./pages/admin/EnrolledStudentDetail";
import { Leads } from "./pages/admin/Leads";
import { LeadDetail } from "./pages/admin/LeadDetail";
import { StudentDetail } from "./pages/admin/StudentDetail";
import { Notifications } from "./pages/admin/Notifications"
import { Newsletter } from "./pages/admin/Newsletter";
import { Appointments } from "./pages/admin/Appointments";
import { Users } from "./pages/admin/Users";
import { CreateRolePage, EditRolePage } from "./pages/admin/RoleEditor";
import { AccountManager } from "./pages/admin/AccountManager";
import { AcceptInvite } from "./pages/AcceptInvite";

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

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  validateSearch: (s: Record<string, unknown>) => ({
    uid: typeof s.uid === "string" ? s.uid : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
  }),
  component: AcceptInvite,
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

const adminPaymentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "payments",
  component: Payments,
});

const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "transactions",
  beforeLoad: () => { throw redirect({ to: '/admin/payments' }) },
  component: () => null,
});

const adminPaymentPlansRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "payment-plans",
  beforeLoad: () => { throw redirect({ to: '/admin/payments' }) },
  component: () => null,
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

const adminEnrolledDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "enrolled/$enrollmentId",
  component: EnrolledStudentDetail,
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
  beforeLoad: () => {
    throw redirect({ to: '/admin/appointments' });
  },
  component: () => null,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "users",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === "users" || s.tab === "roles" || s.tab === "audit" ? s.tab : undefined,
  }),
  beforeLoad: () => {
    const user = getStoredUser();
    if (!user) return;
    // Super admins (no staff_role) always have access — for audit logs tab
    if (user.role === 'admin' && !user.staffRole) return;
    const perms = user.effectivePermissions;
    if (
      perms &&
      !perms.includes('users.view') &&
      !perms.includes('roles.view') &&
      !perms.includes('roles.manage')
    ) {
      throw redirect({ to: '/admin' });
    }
  },
  component: Users,
});

const adminRolesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "roles",
  beforeLoad: () => {
    const user = getStoredUser();
    const perms = user?.effectivePermissions;
    if (perms && !perms.includes('roles.view')) {
      throw redirect({ to: '/admin' });
    }
    throw redirect({ to: '/admin/users', search: { tab: 'roles' } });
  },
  component: () => null,
});

const adminCreateRoleRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "roles/new",
  beforeLoad: () => {
    const user = getStoredUser();
    const perms = user?.effectivePermissions;
    if (perms && !perms.includes('roles.view')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: CreateRolePage,
});

const adminEditRoleRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "roles/$roleId/edit",
  beforeLoad: () => {
    const user = getStoredUser();
    const perms = user?.effectivePermissions;
    if (perms && !perms.includes('roles.view')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: EditRolePage,
});

const adminAuditLogsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "audit-logs",
  beforeLoad: () => {
    throw redirect({ to: '/admin/users', search: { tab: 'audit' } });
  },
  component: () => null,
});

const adminAccountRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "account",
  component: AccountManager,
});

// ─── Route tree ──────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  applyRoute,
  unsubscribeRoute,
  acceptInviteRoute,
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
    adminPaymentsRoute,
    adminTransactionsRoute,
    adminPaymentPlansRoute,
    adminProgramsRoute,
    adminIntakesRoute,
    adminLeadsRoute,
    adminLeadDetailRoute,
    adminEnrolledRoute,
    adminEnrolledDetailRoute,
    adminMessagesRoute,
    adminStudentDetailRoute,
    adminNotificationsRoute,
    adminNewsletterRoute,
    adminAppointmentsRoute,
    adminAppointmentDetailRoute,
    adminUsersRoute,
    adminRolesRoute,
    adminCreateRoleRoute,
    adminEditRoleRoute,
    adminAuditLogsRoute,
    adminAccountRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
