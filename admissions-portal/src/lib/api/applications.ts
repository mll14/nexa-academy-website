import type {
  Application,
  ApplicationStats,
  PaginatedResponse,
  ApiFilters,
  AvailableSlot,
  InterviewSlot,
  AdminNote,
} from "../../types";
import { req, buildQuery } from "./core";

// ── Applications ──────────────────────────────────────────────────────────────

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

export async function getApplicationNotes(applicationId: string): Promise<AdminNote[]> {
  const res = await req<PaginatedResponse<AdminNote> | AdminNote[]>(
    `/application-notes/${buildQuery({ application: applicationId })}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createApplicationNote(data: {
  applicationId: string;
  stage: string;
  html: string;
  text?: string;
}): Promise<AdminNote> {
  return req<AdminNote>("/application-notes/", {
    method: "POST",
    body: JSON.stringify({
      application: data.applicationId,
      stage: data.stage,
      html: data.html,
      text: data.text ?? "",
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

export async function submitApplication(data: Record<string, unknown>): Promise<Application> {
  const headers: Record<string, string> = {};
  const token = data.recaptchaToken ?? data.recaptcha_token;
  if (typeof token === "string" && token) {
    headers["X-Recaptcha-Token"] = token;
  }
  return req<Application>("/applications/", { method: "POST", body: JSON.stringify(data), headers });
}

export async function saveDraft(data: {
  email: string;
  full_name: string;
  program: string;
  step_reached: number;
  phone?: string;
  program_name?: string;
}): Promise<{ id: string; email: string }> {
  return req<{ id: string; email: string }>("/application-drafts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteApplication(id: string): Promise<void> {
  await req(`/applications/${id}/`, { method: "DELETE" });
}

export async function notifyIntake(
  applicationId: string,
  payload: { intake_id?: string; start_date?: string; deadline?: string },
): Promise<{ sent: boolean }> {
  return req(`/applications/${applicationId}/notify_intake/`, {
    method: "POST",
    body: JSON.stringify(payload),
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
  return req<InterviewSlot>(`/applications/${applicationId}/confirm_interview/`, {
    method: "POST",
    body: JSON.stringify({ chosen_time: chosenTime }),
  });
}

export async function rescheduleInterview(
  applicationId: string,
  chosenTime: string,
): Promise<InterviewSlot> {
  return req<InterviewSlot>(`/applications/${applicationId}/reschedule_interview/`, {
    method: "POST",
    body: JSON.stringify({ chosen_time: chosenTime }),
  });
}

export async function cancelInterview(applicationId: string): Promise<void> {
  await req(`/applications/${applicationId}/cancel_interview/`, { method: "POST" });
}

export async function updateInterviewDetails(
  applicationId: string,
  data: { extra_guests?: string[] },
): Promise<InterviewSlot> {
  return req<InterviewSlot>(`/applications/${applicationId}/update_interview_details/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function completeInterview(applicationId: string): Promise<Application> {
  return req<Application>(`/applications/${applicationId}/update_status/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "interview_completed" }),
  });
}

// ── Interview blackouts ───────────────────────────────────────────────────────

export interface Blackout {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  gcal_event_id: string;
  created_by: string;
  created_at: string;
}

export async function getBlackouts(): Promise<Blackout[]> {
  const res = await req<Blackout[] | { results: Blackout[] }>("/interview-blackouts/");
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createBlackout(data: {
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string;
}): Promise<Blackout> {
  return req<Blackout>("/interview-blackouts/", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteBlackout(id: number): Promise<void> {
  await req(`/interview-blackouts/${id}/`, { method: "DELETE" });
}

// ── Custom calendar events ────────────────────────────────────────────────────

export interface CustomCalEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  category: "interview_follow_up" | "lead_follow_up" | "personal" | "meeting" | "other";
  description: string;
  with_meet: boolean;
  meet_url: string;
  attendees: string[];
  gcal_event_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getCustomCalEvents(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<CustomCalEvent[]> {
  const qs = params
    ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()}`
    : "";
  const res = await req<CustomCalEvent[] | { results: CustomCalEvent[] }>(
    `/calendar-events-custom/${qs}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createCustomCalEvent(data: {
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  all_day: boolean;
  category: string;
  description?: string;
  with_meet?: boolean;
  attendees?: string[];
}): Promise<CustomCalEvent> {
  return req<CustomCalEvent>("/calendar-events-custom/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCustomCalEvent(
  id: string,
  data: Partial<CustomCalEvent>,
): Promise<CustomCalEvent> {
  return req<CustomCalEvent>(`/calendar-events-custom/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCustomCalEvent(id: string): Promise<void> {
  await req(`/calendar-events-custom/${id}/`, { method: "DELETE" });
}
