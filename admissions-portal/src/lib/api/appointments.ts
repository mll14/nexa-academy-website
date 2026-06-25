import type { Appointment, AvailableSlot, PaginatedResponse, ApiFilters, AppointmentType, AppointmentHost } from "../../types";
import { req, buildQuery } from "./core";

export async function getAppointments(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<Appointment>> {
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
  const res = await req<AvailableSlot[] | { results: AvailableSlot[] }>(
    "/appointments/available_slots/",
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createAppointment(data: {
  name: string;
  email: string;
  phone: string;
  appointment_type: AppointmentType;
  host: AppointmentHost;
  chosen_time: string;
  reason: string;
  attendees?: string[];
}): Promise<Appointment> {
  return req<Appointment>("/appointments/", { method: "POST", body: JSON.stringify(data) });
}
