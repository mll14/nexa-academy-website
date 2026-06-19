/**
 * api.ts — single source of truth for all API calls.
 * Every function returns data directly and throws ApiError on failure.
 */
import { tokens, setStoredUser } from "./auth";
import type {
  User,
  Application,
  ApplicationStats,
  Program,
  Intake,
  Payment,
  PaymentPlanChangeRequest,
  FinancialReconciliation,
  Notification,
  ContactMessage,
  PaginatedResponse,
  ApiFilters,
  AvailableSlot,
  InterviewSlot,
  Enrollment,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

// ── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string") return d.error;
  if (typeof d.message === "string") return d.message;
  if (typeof d.detail === "string") return d.detail;
  const fields = Object.entries(d)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
    .join(", ");
  return fields || "Request failed";
}

// ── Core fetch ───────────────────────────────────────────────────────────────

export async function req<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokens.access) headers["Authorization"] = `Bearer ${tokens.access}`;

  const url = `${BASE}${endpoint}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && tokens.refresh) {
    const refreshed = await _refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${tokens.access}`;
      const retry = await fetch(url, { ...options, headers });
      const retryData = await retry.json().catch(() => ({}));
      if (!retry.ok)
        throw new ApiError(retry.status, extractMessage(retryData));
      return retryData as T;
    }
    tokens.clear();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, extractMessage(data));
  return data as T;
}

async function _refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.access) {
      tokens.setAccess(data.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function buildQuery(params: ApiFilters): string {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  ) as Record<string, string>;
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  await req("/auth/forgot-password/", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPassword(uid: string, token: string, password: string): Promise<void> {
  await req("/auth/reset-password/", { method: "POST", body: JSON.stringify({ uid, token, password }) });
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User; role: string }> {
  const res = await req<{ access: string; refresh: string }>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  tokens.setAccess(res.access);
  tokens.setRefresh(res.refresh);
  const profile = await getProfile();
  setStoredUser(profile);
  return { user: profile, role: profile.role };
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ user: User }> {
  const res = await req<{ access: string; refresh: string }>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  tokens.setAccess(res.access);
  tokens.setRefresh(res.refresh);
  const profile = await getProfile();
  if (profile.role !== "admin") {
    tokens.clear();
    throw new ApiError(403, "User is not an administrator");
  }
  setStoredUser(profile);
  return { user: profile };
}

export async function googleLogin(
  googleToken: string,
): Promise<{ user: User }> {
  const res = await req<{ access: string; refresh: string; user?: User }>(
    "/auth/login/google/",
    {
      method: "POST",
      body: JSON.stringify({ google_token: googleToken }),
    },
  );
  tokens.setAccess(res.access);
  tokens.setRefresh(res.refresh);
  const profile = res.user ?? (await getProfile());
  setStoredUser(profile);
  return { user: profile };
}

export async function logout(): Promise<void> {
  try {
    if (tokens.refresh) {
      await req("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
    }
  } finally {
    tokens.clear();
  }
}

export async function getProfile(): Promise<User> {
  return req<User>("/auth/profile/");
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  return req<User>("/auth/profile/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function getApplications(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<Application>> {
  const res = await req<PaginatedResponse<Application> | Application[]>(
    `/applications/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function getApplicationById(id: string): Promise<Application> {
  return req<Application>(`/applications/${id}/`);
}

export async function updateApplicationStatus(
  id: string,
  status: string,
  notes = "",
): Promise<Application> {
  return req<Application>(`/applications/${id}/update_status/`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  return req<ApplicationStats>("/applications/stats/");
}

export async function submitApplication(
  data: Record<string, unknown>,
): Promise<Application> {
  return req<Application>("/applications/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveDraft(data: {
  email: string;
  full_name: string;
  program: string;
  step_reached: number;
}): Promise<{ id: string; email: string }> {
  return req<{ id: string; email: string }>("/application-drafts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Interview scheduling ──────────────────────────────────────────────────────

export async function getAvailableSlots(applicationId: string): Promise<{
  slots: AvailableSlot[];
  available: string[];
}> {
  return req(`/applications/${applicationId}/available_slots/`);
}

export async function confirmInterview(
  applicationId: string,
  chosenTime: string,
): Promise<InterviewSlot> {
  return req<InterviewSlot>(
    `/applications/${applicationId}/confirm_interview/`,
    {
      method: "POST",
      body: JSON.stringify({ chosen_time: chosenTime }),
    },
  );
}

export async function rescheduleInterview(
  applicationId: string,
  chosenTime: string,
): Promise<InterviewSlot> {
  return req<InterviewSlot>(
    `/applications/${applicationId}/reschedule_interview/`,
    {
      method: "POST",
      body: JSON.stringify({ chosen_time: chosenTime }),
    },
  );
}

export async function cancelInterview(applicationId: string): Promise<void> {
  await req(`/applications/${applicationId}/cancel_interview/`, {
    method: "POST",
  });
}

export async function completeInterview(
  applicationId: string,
): Promise<Application> {
  return req<Application>(`/applications/${applicationId}/update_status/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "interview_completed" }),
  });
}

// ── Programs ─────────────────────────────────────────────────────────────────

export async function getPrograms(
  filters: ApiFilters = {},
): Promise<Program[]> {
  const res = await req<PaginatedResponse<Program> | Program[]>(
    `/programs/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const programs = await getPrograms({ slug });
  return programs[0] ?? null;
}

export async function createProgram(data: Partial<Program>): Promise<Program> {
  return req<Program>("/programs/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProgram(
  id: string,
  data: Partial<Program>,
): Promise<Program> {
  return req<Program>(`/programs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProgram(id: string): Promise<void> {
  await req(`/programs/${id}/`, { method: "DELETE" });
}

// ── Intakes ───────────────────────────────────────────────────────────────────

export async function getIntakes(filters: ApiFilters = {}): Promise<Intake[]> {
  const res = await req<PaginatedResponse<Intake> | Intake[]>(
    `/intakes/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createIntake(data: Partial<Intake>): Promise<Intake> {
  return req<Intake>("/intakes/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIntake(
  id: string,
  data: Partial<Intake>,
): Promise<Intake> {
  return req<Intake>(`/intakes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteIntake(id: string): Promise<void> {
  await req(`/intakes/${id}/`, { method: "DELETE" });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getPayments(
  filters: ApiFilters = {},
): Promise<Payment[]> {
  const res = await req<PaginatedResponse<Payment> | Payment[]>(
    `/payments/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function getFinancialReconciliation(studentId?: string): Promise<FinancialReconciliation> {
  return req<FinancialReconciliation>(
    `/payments/reconciliation/${buildQuery(studentId ? { student: studentId } : {})}`,
  );
}

export async function getPaymentPlanRequests(
  filters: ApiFilters = {},
): Promise<PaymentPlanChangeRequest[]> {
  const res = await req<PaginatedResponse<PaymentPlanChangeRequest> | PaymentPlanChangeRequest[]>(
    `/payment-plan-requests/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createPaymentPlanRequest(data: {
  enrollmentId: string;
  requestedPaymentPlan: string;
  requestedInstallmentAmount: number;
  reason?: string;
}): Promise<PaymentPlanChangeRequest> {
  return req<PaymentPlanChangeRequest>("/payment-plan-requests/", {
    method: "POST",
    body: JSON.stringify({
      enrollment: data.enrollmentId,
      requested_payment_plan: data.requestedPaymentPlan,
      requested_installment_amount: data.requestedInstallmentAmount,
      reason: data.reason ?? "",
    }),
  });
}

export async function approvePaymentPlanRequest(
  requestId: string,
  data: { paymentPlan?: string; installmentAmount?: number; adminNotes?: string },
): Promise<PaymentPlanChangeRequest> {
  return req<PaymentPlanChangeRequest>(`/payment-plan-requests/${requestId}/approve/`, {
    method: "POST",
    body: JSON.stringify({
      payment_plan: data.paymentPlan,
      installment_amount: data.installmentAmount,
      admin_notes: data.adminNotes ?? "",
    }),
  });
}

export async function rejectPaymentPlanRequest(
  requestId: string,
  data: { adminNotes?: string },
): Promise<PaymentPlanChangeRequest> {
  return req<PaymentPlanChangeRequest>(`/payment-plan-requests/${requestId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ admin_notes: data.adminNotes ?? "" }),
  });
}

export async function initializePayment(data: {
  amount: number;
  programId?: string | null;
  paymentType: string;
  email?: string;
}): Promise<{
  access_code?: string;
  reference?: string;
  public_key?: string;
  authorization_url?: string;
  simulated?: boolean;
  data?: { reference: string; authorization_url: string };
}> {
  return req("/payments/initialize_payment/", {
    method: "POST",
    body: JSON.stringify({
      amount: data.amount,
      program_id: data.programId,
      payment_type: data.paymentType,
      email: data.email,
    }),
  });
}

export async function verifyPayment(reference: string): Promise<{
  status: string;
  payment?: { status: string };
}> {
  return req("/payments/verify_payment/", {
    method: "POST",
    body: JSON.stringify({ reference }),
  });
}

export async function checkPaymentStatus(paymentId: string): Promise<{
  payment: Payment;
  paystack_status: string;
}> {
  return req(`/payments/${paymentId}/check_status/`, { method: "POST" });
}

export async function backfillEnrollments(): Promise<{
  enrolled_count: number;
}> {
  return req("/payments/backfill_enrollments/", { method: "POST" });
}

export async function getPaystackPublicKey(): Promise<string> {
  return import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "";
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const res = await req<PaginatedResponse<Notification> | Notification[]>(
    `/notifications/${buildQuery({ limit })}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function markAllNotificationsRead(): Promise<void> {
  await req("/notifications/mark_all_read/", { method: "POST" });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<ContactMessage>> {
  const res = await req<PaginatedResponse<ContactMessage> | ContactMessage[]>(
    `/messages/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function markMessageRead(id: string): Promise<void> {
  await req(`/messages/${id}/mark_read/`, { method: "POST" });
}

// ── Students (admin) ──────────────────────────────────────────────────────────

export async function getStudentDetail(uid: string): Promise<{
  user: User;
  applications: Application[];
  payments: Payment[];
  enrollments: Enrollment[];
  reconciliation?: FinancialReconciliation;
}> {
  return req(`/auth/students/${uid}/`);
}

export async function getStudents(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<User>> {
  const res = await req<PaginatedResponse<User> | User[]>(
    `/auth/users/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function getProgramInterests(filters: ApiFilters = {}) {
  return req<{ count: number; results: import('../types').ProgramInterest[]; program_counts?: { program_slug: string; program_name: string; count: number }[] }>(
    `/programs/program-interests/${buildQuery(filters)}`
  )
}

export async function notifyProgramInterests(data: {
  program_slug?: string
  program_name?: string
  start_date: string
  deadline?: string
  apply_url?: string
  ids?: string[]
}) {
  return req<{ sent: number; failed: number }>('/programs/program-interests/notify/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getHelpMeLeads(filters: ApiFilters = {}) {
  return req<{ count: number; results: import('../types').HelpMeLead[] }>(
    `/programs/help-me/${buildQuery(filters)}`
  )
}

export async function getIncompleteApplications(filters: ApiFilters = {}) {
  return req<{ count: number; results: import('../types').IncompleteApplication[] }>(
    `/programs/incomplete/${buildQuery(filters)}`
  )
}

export async function getEnrollments(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<Enrollment>> {
  const res = await req<PaginatedResponse<Enrollment> | Enrollment[]>(
    `/enrollments/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function getNewsletterSubscribers(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<import('../types').NewsletterSubscriber>> {
  const res = await req<PaginatedResponse<import('../types').NewsletterSubscriber> | import('../types').NewsletterSubscriber[]>(
    `/newsletter/${buildQuery(filters)}`,
  )
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res }
  return res
}

export async function getNewsletterCampaigns(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<import('../types').NewsletterCampaign>> {
  const res = await req<PaginatedResponse<import('../types').NewsletterCampaign> | import('../types').NewsletterCampaign[]>(
    `/newsletter-campaigns/${buildQuery(filters)}`,
  )
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res }
  return res
}

export async function createCampaign(
  data: { subject: string; preview_text?: string; html_body: string },
): Promise<import('../types').NewsletterCampaign> {
  return req('/newsletter-campaigns/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCampaign(
  id: string,
  data: { subject?: string; preview_text?: string; html_body?: string },
): Promise<import('../types').NewsletterCampaign> {
  return req(`/newsletter-campaigns/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteCampaign(id: string): Promise<void> {
  await req(`/newsletter-campaigns/${id}/`, { method: 'DELETE' })
}

export async function sendCampaign(
  id: string,
): Promise<{ success: boolean; sent_count: number; failed_count: number; total: number }> {
  return req(`/newsletter-campaigns/${id}/send/`, { method: 'POST' })
}

export async function getSubscriberCount(): Promise<{ count: number }> {
  return req('/newsletter-campaigns/subscriber_count/')
}

export async function exportSubscribers(): Promise<void> {
  const headers: Record<string, string> = {}
  const { tokens } = await import('./auth')
  if (tokens.access) headers['Authorization'] = `Bearer ${tokens.access}`
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/newsletter/export/`, { headers })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'newsletter_subscribers.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function notifyIntake(
  applicationId: string,
  payload: { intake_id?: string; start_date?: string; deadline?: string },
): Promise<{ sent: boolean }> {
  return req(`/applications/${applicationId}/notify_intake/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function manualEnroll(data: {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  programId: string;
  amount: number;
  amountPaid?: number;
}): Promise<unknown> {
  return req("/enrollments/manual_enroll/", {
    method: "POST",
    body: JSON.stringify({
      student_id: data.studentId || undefined,
      student_name: data.studentName,
      student_email: data.studentEmail,
      program_id: data.programId,
      amount: data.amount,
      amount_paid: data.amountPaid ?? 0,
    }),
  });
}
