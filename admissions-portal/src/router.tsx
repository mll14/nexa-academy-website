import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { getProfile, tryRefreshToken } from "./lib/api";
import { tokens, getStoredUser, setStoredUser } from "./lib/auth";
import type { User } from "./types";

// ─── Lazy page imports ───────────────────────────────────────────────────────
// Each route chunk is only downloaded when that route is first visited.

const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const Apply = lazy(() => import("./pages/Apply").then(m => ({ default: m.Apply })));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe").then(m => ({ default: m.Unsubscribe })));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite").then(m => ({ default: m.AcceptInvite })));

const StudentDashboard = lazy(() => import("./pages/student/Dashboard").then(m => ({ default: m.StudentDashboard })));
const StudentApplication = lazy(() => import("./pages/student/Dashboard").then(m => ({ default: m.StudentApplication })));
const StudentPayments = lazy(() => import("./pages/student/Dashboard").then(m => ({ default: m.StudentPayments })));
const StudentNotifications = lazy(() => import("./pages/student/Dashboard").then(m => ({ default: m.StudentNotifications })));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile").then(m => ({ default: m.StudentProfile })));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard").then(m => ({ default: m.AdminDashboard })));
const Applications = lazy(() => import("./pages/admin/Applications").then(m => ({ default: m.Applications })));
const ApplicationDetail = lazy(() => import("./pages/admin/ApplicationDetail").then(m => ({ default: m.ApplicationDetail })));
const Interviews = lazy(() => import("./pages/admin/Interviews").then(m => ({ default: m.Interviews })));
const Payments = lazy(() => import("./pages/admin/Payments").then(m => ({ default: m.Payments })));
const Programs = lazy(() => import("./pages/admin/Programs").then(m => ({ default: m.Programs })));
const Messages = lazy(() => import("./pages/admin/Messages").then(m => ({ default: m.Messages })));
const EnrolledStudents = lazy(() => import("./pages/admin/EnrolledStudents").then(m => ({ default: m.EnrolledStudents })));
const EnrolledStudentDetail = lazy(() => import("./pages/admin/EnrolledStudentDetail").then(m => ({ default: m.EnrolledStudentDetail })));
const Leads = lazy(() => import("./pages/admin/Leads").then(m => ({ default: m.Leads })));
const LeadDetail = lazy(() => import("./pages/admin/LeadDetail").then(m => ({ default: m.LeadDetail })));
const StudentDetail = lazy(() => import("./pages/admin/StudentDetail").then(m => ({ default: m.StudentDetail })));
const Notifications = lazy(() => import("./pages/admin/Notifications").then(m => ({ default: m.Notifications })));
const Newsletter = lazy(() => import("./pages/admin/Newsletter").then(m => ({ default: m.Newsletter })));
const Appointments = lazy(() => import("./pages/admin/Appointments").then(m => ({ default: m.Appointments })));
const Users = lazy(() => import("./pages/admin/Users").then(m => ({ default: m.Users })));
const CreateRolePage = lazy(() => import("./pages/admin/RoleEditor").then(m => ({ default: m.CreateRolePage })));
const EditRolePage = lazy(() => import("./pages/admin/RoleEditor").then(m => ({ default: m.EditRolePage })));
const AccountManager = lazy(() => import("./pages/admin/AccountManager").then(m => ({ default: m.AccountManager })));

// ─── Suspense spinner ────────────────────────────────────────────────────────

function RouteSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Permission helper ───────────────────────────────────────────────────────

function requirePermission(codename: string) {
  const user = getStoredUser()
  if (!user) return
  // staffRole === null/undefined means super admin — unrestricted access
  if (!user.staffRole) return
  if (user.effectivePermissions && !user.effectivePermissions.includes(codename)) {
    throw redirect({ to: '/admin' })
  }
}

let sessionRestorePromise: Promise<User | null> | null = null;

async function restoreSessionUser(): Promise<User | null> {
  if (tokens.access) {
    const user = getStoredUser();
    if (user) return user;
  } else {
    sessionRestorePromise ??= tryRefreshToken()
      .then((restored) => (restored ? getProfile() : null))
      .then((user) => {
        if (user) setStoredUser(user);
        return user;
      })
      .catch(() => null)
      .finally(() => {
        sessionRestorePromise = null;
      });

    const restoredUser = await sessionRestorePromise;
    if (restoredUser) return restoredUser;
  }

  try {
    const user = await getProfile();
    setStoredUser(user);
    return user;
  } catch {
    return null;
  }
}

async function requireSession(redirectTo?: string): Promise<User> {
  const user = await restoreSessionUser();
  if (!user) {
    throw redirect({ to: "/login", search: { redirect: redirectTo } });
  }
  return user;
}

// ─── Root ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Suspense fallback={<RouteSpinner />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  ),
});

// ─── Public routes ───────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const user = await restoreSessionUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: undefined } });
    if (user.role === "admin") throw redirect({ to: "/admin" });
    throw redirect({ to: "/student/dashboard" });
  },
  component: () => null,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await restoreSessionUser();
    if (!user) return;

    const redirectTo = search.redirect;
    if (redirectTo) {
      const isAdminPath = redirectTo.startsWith("/admin");
      const isStudentPath = redirectTo.startsWith("/student");
      if (user.role === "admin" && isAdminPath) throw redirect({ to: redirectTo });
      if (user.role === "student" && isStudentPath) throw redirect({ to: redirectTo });
    }

    if (user.role === "admin") throw redirect({ to: "/admin" });
    if (user.role === "student") throw redirect({ to: "/student/dashboard" });
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
  beforeLoad: async ({ location }) => {
    const user = await requireSession(location.href);
    if (user.role === "admin") throw redirect({ to: "/admin" });
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

const studentProfileRoute = createRoute({
  getParentRoute: () => studentLayoutRoute,
  path: "profile",
  component: StudentProfile,
});

// ─── Admin layout — /admin/* ─────────────────────────────────────────────────

const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: async ({ location }) => {
    const user = await requireSession(location.href);
    if (user.role !== "admin") throw redirect({ to: "/login", search: { redirect: undefined } });
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
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'all' || s.tab === 'with' || s.tab === 'without' ? s.tab as 'all' | 'with' | 'without' : undefined,
  }),
  beforeLoad: () => requirePermission('applications.view'),
  component: Applications,
});

const adminApplicationDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "applications/$id",
  beforeLoad: () => requirePermission('applications.view'),
  component: ApplicationDetail,
});

const adminInterviewsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "interviews",
  beforeLoad: () => requirePermission('interviews.view'),
  component: Interviews,
});

const adminPaymentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "payments",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'transactions' || s.tab === 'payment-plans' ? s.tab as 'transactions' | 'payment-plans' : undefined,
  }),
  beforeLoad: () => requirePermission('transactions.view'),
  component: Payments,
});

const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "transactions",
  beforeLoad: () => { throw redirect({ to: '/admin/payments', search: { tab: undefined } }) },
  component: () => null,
});

const adminPaymentPlansRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "payment-plans",
  beforeLoad: () => { throw redirect({ to: '/admin/payments', search: { tab: undefined } }) },
  component: () => null,
});

const adminProgramsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "programs",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'programs' || s.tab === 'intakes' ? s.tab as 'programs' | 'intakes' : undefined,
  }),
  beforeLoad: () => requirePermission('programs.view'),
  component: Programs,
});

const adminIntakesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "intakes",
  beforeLoad: () => { throw redirect({ to: '/admin/programs', search: { tab: undefined } }) },
  component: () => null,
});

const adminLeadsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "leads",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'incomplete' || s.tab === 'help_me' || s.tab === 'interests' ? s.tab as 'incomplete' | 'help_me' | 'interests' : undefined,
  }),
  beforeLoad: () => requirePermission('leads.view'),
  component: Leads,
});

const adminLeadDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "leads/$leadType/$id",
  beforeLoad: () => requirePermission('leads.view'),
  component: LeadDetail,
});

const adminEnrolledRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "enrolled",
  beforeLoad: () => requirePermission('students.view'),
  component: EnrolledStudents,
});

const adminEnrolledDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "enrolled/$enrollmentId",
  beforeLoad: () => requirePermission('students.view'),
  component: EnrolledStudentDetail,
});

const adminMessagesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "messages",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'pending' || s.tab === 'done' ? s.tab as 'pending' | 'done' : undefined,
  }),
  beforeLoad: () => requirePermission('messages.view'),
  component: Messages,
});

const adminStudentDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "students/$uid",
  beforeLoad: () => requirePermission('students.view'),
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
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'campaigns' || s.tab === 'subscribers' ? s.tab as 'campaigns' | 'subscribers' : undefined,
  }),
  beforeLoad: () => requirePermission('newsletter.view'),
  component: Newsletter,
});

const adminAppointmentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "appointments",
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === 'all' || s.tab === 'scheduled' || s.tab === 'completed' || s.tab === 'cancelled' || s.tab === 'no_show'
      ? s.tab as 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no_show'
      : undefined,
  }),
  beforeLoad: () => requirePermission('appointments.view'),
  component: Appointments,
});

const adminAppointmentDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "appointments/$id",
  beforeLoad: () => {
    throw redirect({ to: '/admin/appointments', search: { tab: undefined } });
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
    studentProfileRoute,
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
