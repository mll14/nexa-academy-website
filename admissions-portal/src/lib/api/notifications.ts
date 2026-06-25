import type { Notification, ContactMessage, PaginatedResponse, ApiFilters } from "../../types";
import type { NewsletterSubscriber, NewsletterCampaign } from "../../types";
import { req, buildQuery, BASE, refreshToken, ApiError } from "./core";
import { tokens } from "../auth";

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
  to: string;
  name?: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean }> {
  return req("/admin/send-follow-up/", { method: "POST", body: JSON.stringify(data) });
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

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function getNewsletterSubscribers(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<NewsletterSubscriber>> {
  const res = await req<PaginatedResponse<NewsletterSubscriber> | NewsletterSubscriber[]>(
    `/newsletter/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function getNewsletterCampaigns(
  filters: ApiFilters = {},
): Promise<PaginatedResponse<NewsletterCampaign>> {
  const res = await req<PaginatedResponse<NewsletterCampaign> | NewsletterCampaign[]>(
    `/newsletter-campaigns/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function createCampaign(data: {
  subject: string;
  preview_text?: string;
  html_body: string;
}): Promise<NewsletterCampaign> {
  return req("/newsletter-campaigns/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCampaign(
  id: string,
  data: { subject?: string; preview_text?: string; html_body?: string },
): Promise<NewsletterCampaign> {
  return req(`/newsletter-campaigns/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCampaign(id: string): Promise<void> {
  await req(`/newsletter-campaigns/${id}/`, { method: "DELETE" });
}

export async function sendCampaign(
  id: string,
): Promise<{ success: boolean; sent_count: number; failed_count: number; total: number }> {
  return req(`/newsletter-campaigns/${id}/send/`, { method: "POST" });
}

export async function getSubscriberCount(): Promise<{ count: number }> {
  return req("/newsletter-campaigns/subscriber_count/");
}

export async function exportSubscribers(): Promise<void> {
  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (tokens.access) headers["Authorization"] = `Bearer ${tokens.access}`;
    return fetch(`${BASE}/newsletter/export/`, { headers, credentials: "include" });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (!refreshed) throw new ApiError(401, "Session expired. Please log in again.");
    res = await doFetch();
  }
  if (!res.ok) throw new ApiError(res.status, "Export failed. Please try again.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "newsletter_subscribers.csv";
  a.click();
  URL.revokeObjectURL(url);
}
