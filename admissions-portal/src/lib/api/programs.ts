import type {
  Program,
  Intake,
  Enrollment,
  PaginatedResponse,
  ApiFilters,
  ProgramInterest,
  HelpMeLead,
  IncompleteApplication,
  LeadStatus,
  AdminNote,
} from "../../types";
import { req, buildQuery } from "./core";

// ── Programs ──────────────────────────────────────────────────────────────────

export async function getPrograms(filters: ApiFilters = {}): Promise<Program[]> {
  const res = await req<PaginatedResponse<Program> | Program[]>(`/programs/${buildQuery(filters)}`);
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const programs = await getPrograms({ slug });
  return programs[0] ?? null;
}

export async function createProgram(data: Partial<Program>): Promise<Program> {
  return req<Program>("/programs/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateProgram(id: string, data: Partial<Program>): Promise<Program> {
  return req<Program>(`/programs/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteProgram(id: string): Promise<void> {
  await req(`/programs/${id}/`, { method: "DELETE" });
}

// ── Intakes ───────────────────────────────────────────────────────────────────

export async function getIntakes(filters: ApiFilters = {}): Promise<Intake[]> {
  const res = await req<PaginatedResponse<Intake> | Intake[]>(`/intakes/${buildQuery(filters)}`);
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createIntake(data: Partial<Intake>): Promise<Intake> {
  return req<Intake>("/intakes/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateIntake(id: string, data: Partial<Intake>): Promise<Intake> {
  return req<Intake>(`/intakes/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteIntake(id: string): Promise<void> {
  await req(`/intakes/${id}/`, { method: "DELETE" });
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  withdrawn: number;
  total_revenue: number;
  total_outstanding: number;
}

export interface EnrollmentListResponse extends PaginatedResponse<Enrollment> {
  stats?: EnrollmentStats;
}

export interface EnrollmentFilters {
  search?: string;
  status?: string;
  program?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export async function getEnrollments(
  filters: EnrollmentFilters = {},
): Promise<EnrollmentListResponse> {
  const res = await req<EnrollmentListResponse | Enrollment[]>(
    `/enrollments/${buildQuery(filters as Record<string, unknown>)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function getEnrollmentById(id: string): Promise<Enrollment> {
  return req<Enrollment>(`/enrollments/${id}/`);
}

export async function updateEnrollment(
  id: string,
  data: { status?: string; amount?: number; amount_paid?: number; payment_plan?: string },
): Promise<Enrollment> {
  return req<Enrollment>(`/enrollments/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export interface ManualEnrollResult {
  student_uid: string;
  student_email: string;
  application_id: string;
  enrollment_id?: string;
  is_new_account: boolean;
  payment_id?: string;
  reference?: string;
  access_code?: string;
  authorization_url?: string;
  public_key?: string;
  amount?: string;
}

export async function manualEnroll(data: {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  phone?: string;
  startDate?: string;
  programId: string;
  paymentPlan?: string;
  depositAmount?: number;
}): Promise<ManualEnrollResult> {
  return req<ManualEnrollResult>("/enrollments/manual_enroll/", {
    method: "POST",
    body: JSON.stringify({
      student_id: data.studentId || undefined,
      student_name: data.studentName,
      student_email: data.studentEmail,
      phone: data.phone || undefined,
      start_date: data.startDate || undefined,
      program_id: data.programId,
      payment_plan: data.paymentPlan || undefined,
      deposit_amount: data.depositAmount || undefined,
    }),
  });
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function getProgramInterests(filters: ApiFilters = {}) {
  return req<{
    count: number;
    results: ProgramInterest[];
    program_counts?: { program_slug: string; program_name: string; count: number }[];
  }>(`/programs/program-interests/${buildQuery(filters)}`);
}

export async function getProgramInterest(id: string) {
  return req<ProgramInterest>(`/programs/program-interests/${id}/`);
}

export async function notifyProgramInterests(data: {
  program_slug?: string;
  program_name?: string;
  start_date: string;
  deadline?: string;
  apply_url?: string;
  ids?: string[];
}) {
  return req<{ sent: number; failed: number }>("/programs/program-interests/notify/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function submitComingSoonInterest(data: {
  name: string;
  email: string;
  phone?: string;
  program_slug: string;
  program_name: string;
  message?: string;
}): Promise<ProgramInterest> {
  return req<ProgramInterest>("/programs/interest/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteProgramInterestLead(id: string): Promise<void> {
  await req(`/programs/program-interests/${id}/`, { method: "DELETE" });
}

export async function getHelpMeLeads(filters: ApiFilters = {}) {
  return req<{ count: number; results: HelpMeLead[] }>(`/programs/help-me/${buildQuery(filters)}`);
}

export async function getHelpMeLead(id: string) {
  return req<HelpMeLead>(`/programs/help-me/${id}/`);
}

export async function submitHelpMeLead(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): Promise<HelpMeLead> {
  return req<HelpMeLead>("/programs/help-me/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function convertHelpMeToPipeline(
  id: string,
  programSlug: string,
  programName: string,
): Promise<HelpMeLead> {
  return req(`/programs/help-me/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "convert_to_pipeline",
      program_slug: programSlug,
      program_name: programName,
    }),
  });
}

export async function deleteHelpMeLead(id: string): Promise<void> {
  await req(`/programs/help-me/${id}/`, { method: "DELETE" });
}

export async function getIncompleteApplications(filters: ApiFilters = {}) {
  return req<{ count: number; results: IncompleteApplication[] }>(
    `/programs/incomplete/${buildQuery(filters)}`,
  );
}

export async function getIncompleteApplication(id: string) {
  return req<IncompleteApplication>(`/programs/incomplete/${id}/`);
}

export async function deleteIncompleteLead(id: string): Promise<void> {
  await req(`/programs/incomplete/${id}/`, { method: "DELETE" });
}

export async function markLeadCompleted(
  leadType: "interests" | "help-me" | "incomplete",
  id: string,
): Promise<unknown> {
  const path =
    leadType === "interests"
      ? `/programs/program-interests/${id}/`
      : leadType === "help-me"
        ? `/programs/help-me/${id}/`
        : `/programs/incomplete/${id}/`;
  return req(path, { method: "PATCH", body: JSON.stringify({ action: "complete" }) });
}

export async function revertLeadCompleted(
  leadType: "interests" | "help-me" | "incomplete",
  id: string,
): Promise<unknown> {
  const path =
    leadType === "interests"
      ? `/programs/program-interests/${id}/`
      : leadType === "help-me"
        ? `/programs/help-me/${id}/`
        : `/programs/incomplete/${id}/`;
  return req(path, { method: "PATCH", body: JSON.stringify({ action: "revert" }) });
}

export async function updateLeadStatus(
  leadType: "interests" | "help-me" | "incomplete",
  id: string,
  leadStatus: LeadStatus,
): Promise<ProgramInterest | HelpMeLead | IncompleteApplication> {
  const path =
    leadType === "interests"
      ? `/programs/program-interests/${id}/`
      : leadType === "help-me"
        ? `/programs/help-me/${id}/`
        : `/programs/incomplete/${id}/`;
  return req(path, {
    method: "PATCH",
    body: JSON.stringify({ action: "set_status", lead_status: leadStatus }),
  });
}

// ── Lead notes ────────────────────────────────────────────────────────────────

export async function getLeadNotes(filters: {
  lead_type: "program_interest" | "help_me" | "incomplete_application";
  lead_id: string;
}): Promise<AdminNote[]> {
  const res = await req<PaginatedResponse<AdminNote> | AdminNote[]>(
    `/lead-notes/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createLeadNote(data: {
  lead_type: "program_interest" | "help_me" | "incomplete_application";
  lead_id: string;
  stage: string;
  html: string;
  text?: string;
}): Promise<AdminNote> {
  return req<AdminNote>("/lead-notes/", {
    method: "POST",
    body: JSON.stringify({
      lead_type: data.lead_type,
      lead_id: data.lead_id,
      stage: data.stage,
      html: data.html,
      text: data.text ?? "",
    }),
  });
}
