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
  Appointment,
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

export async function getApplicationNotes(applicationId: string): Promise<import('../types').AdminNote[]> {
  const res = await req<PaginatedResponse<import('../types').AdminNote> | import('../types').AdminNote[]>(
    `/application-notes/${buildQuery({ application: applicationId })}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createApplicationNote(data: {
  applicationId: string;
  stage: string;
  html: string;
  text?: string;
}): Promise<import('../types').AdminNote> {
  return req<import('../types').AdminNote>('/application-notes/', {
    method: 'POST',
    body: JSON.stringify({
      application: data.applicationId,
      stage: data.stage,
      html: data.html,
      text: data.text ?? '',
    }),
  });
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

export async function adminSendPaymentLink(data: {
  studentUid: string;
  amount: number;
  description?: string;
  programId?: string;
}): Promise<{ payment_id: string; reference: string; access_code: string; authorization_url: string; public_key: string; student_email: string; amount: string }> {
  return req("/payments/admin_send_payment_link/", {
    method: "POST",
    body: JSON.stringify({
      student_uid: data.studentUid,
      amount: data.amount,
      description: data.description,
      program_id: data.programId,
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

export async function sendFollowUp(data: {
  to: string
  name?: string
  subject: string
  message: string
}): Promise<{ sent: boolean }> {
  return req('/admin/send-follow-up/', { method: 'POST', body: JSON.stringify(data) })
}

export async function markMessageRead(id: string): Promise<void> {
  await req(`/messages/${id}/mark_read/`, { method: "POST" });
}

export async function markMessageCompleted(id: string): Promise<void> {
  await req(`/messages/${id}/mark_completed/`, { method: "POST" });
}

export async function revertMessageCompleted(id: string): Promise<void> {
  await req(`/messages/${id}/revert_completed/`, { method: "POST" });
}

export async function markLeadCompleted(
  leadType: 'interests' | 'help-me' | 'incomplete',
  id: string,
): Promise<unknown> {
  const path =
    leadType === 'interests' ? `/programs/program-interests/${id}/`
    : leadType === 'help-me' ? `/programs/help-me/${id}/`
    : `/programs/incomplete/${id}/`
  return req(path, { method: 'PATCH', body: JSON.stringify({ action: 'complete' }) })
}

export async function revertLeadCompleted(
  leadType: 'interests' | 'help-me' | 'incomplete',
  id: string,
): Promise<unknown> {
  const path =
    leadType === 'interests' ? `/programs/program-interests/${id}/`
    : leadType === 'help-me' ? `/programs/help-me/${id}/`
    : `/programs/incomplete/${id}/`
  return req(path, { method: 'PATCH', body: JSON.stringify({ action: 'revert' }) })
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

export async function getProgramInterest(id: string) {
  return req<import('../types').ProgramInterest>(`/programs/program-interests/${id}/`)
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

export async function getHelpMeLead(id: string) {
  return req<import('../types').HelpMeLead>(`/programs/help-me/${id}/`)
}

export async function getIncompleteApplications(filters: ApiFilters = {}) {
  return req<{ count: number; results: import('../types').IncompleteApplication[] }>(
    `/programs/incomplete/${buildQuery(filters)}`
  )
}

export async function getIncompleteApplication(id: string) {
  return req<import('../types').IncompleteApplication>(`/programs/incomplete/${id}/`)
}

export async function getLeadNotes(filters: {
  lead_type: 'program_interest' | 'help_me' | 'incomplete_application'
  lead_id: string
}): Promise<import('../types').AdminNote[]> {
  const res = await req<PaginatedResponse<import('../types').AdminNote> | import('../types').AdminNote[]>(
    `/lead-notes/${buildQuery(filters)}`,
  )
  return Array.isArray(res) ? res : (res.results ?? [])
}

export async function createLeadNote(data: {
  lead_type: 'program_interest' | 'help_me' | 'incomplete_application'
  lead_id: string
  stage: string
  html: string
  text?: string
}): Promise<import('../types').AdminNote> {
  return req<import('../types').AdminNote>('/lead-notes/', {
    method: 'POST',
    body: JSON.stringify({
      lead_type: data.lead_type,
      lead_id: data.lead_id,
      stage: data.stage,
      html: data.html,
      text: data.text ?? '',
    }),
  })
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

// ── Appointments ──────────────────────────────────────────────────────────────

export async function getAppointments(filters: ApiFilters = {}): Promise<PaginatedResponse<Appointment>> {
  return req<PaginatedResponse<Appointment>>(`/appointments/${buildQuery(filters)}`);
}

export async function getAppointment(id: string): Promise<Appointment> {
  return req<Appointment>(`/appointments/${id}/`);
}

export async function updateAppointment(
  id: string,
  data: { status?: string; admin_notes?: string },
): Promise<Appointment> {
  return req<Appointment>(`/appointments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  return req<Appointment>(`/appointments/${id}/cancel/`, { method: "PATCH" });
}

export async function getAppointmentAvailableSlots(): Promise<AvailableSlot[]> {
  const res = await req<AvailableSlot[] | { results: AvailableSlot[] }>('/appointments/available_slots/')
  return Array.isArray(res) ? res : (res.results ?? [])
}

export async function createAppointment(data: {
  name: string
  email: string
  phone: string
  appointment_type: import('../types').AppointmentType
  host: import('../types').AppointmentHost
  chosen_time: string
  reason: string
  attendees?: string[]
}): Promise<Appointment> {
  return req<Appointment>('/appointments/', { method: 'POST', body: JSON.stringify(data) })
}

// ── Interview blackouts ───────────────────────────────────────────────────────

export interface Blackout {
  id: number
  date: string
  start_time: string | null
  end_time: string | null
  reason: string
  gcal_event_id: string
  created_by: string
  created_at: string
}

export async function getBlackouts(): Promise<Blackout[]> {
  const res = await req<Blackout[] | { results: Blackout[] }>('/interview-blackouts/')
  return Array.isArray(res) ? res : (res.results ?? [])
}

export async function createBlackout(data: {
  date: string
  start_time?: string | null
  end_time?: string | null
  reason?: string
}): Promise<Blackout> {
  return req<Blackout>('/interview-blackouts/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteBlackout(id: number): Promise<void> {
  await req(`/interview-blackouts/${id}/`, { method: 'DELETE' })
}

// ── Custom calendar events ────────────────────────────────────────────────────

export interface CustomCalEvent {
  id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  category: 'interview_follow_up' | 'lead_follow_up' | 'personal' | 'meeting' | 'other'
  description: string
  with_meet: boolean
  meet_url: string
  attendees: string[]
  gcal_event_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export async function getCustomCalEvents(params?: { date_from?: string; date_to?: string }): Promise<CustomCalEvent[]> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([,v]) => v) as [string, string][]).toString()}` : ''
  const res = await req<CustomCalEvent[] | { results: CustomCalEvent[] }>(`/calendar-events-custom/${qs}`)
  return Array.isArray(res) ? res : (res.results ?? [])
}

export async function createCustomCalEvent(data: {
  title: string
  date: string
  start_time?: string | null
  end_time?: string | null
  all_day: boolean
  category: string
  description?: string
  with_meet?: boolean
  attendees?: string[]
}): Promise<CustomCalEvent> {
  return req<CustomCalEvent>('/calendar-events-custom/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCustomCalEvent(id: string, data: Partial<CustomCalEvent>): Promise<CustomCalEvent> {
  return req<CustomCalEvent>(`/calendar-events-custom/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteCustomCalEvent(id: string): Promise<void> {
  await req(`/calendar-events-custom/${id}/`, { method: 'DELETE' })
}
