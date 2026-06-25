import { tokens, dispatchSessionExpired } from "../auth";

export const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function extractMessage(data: unknown): string {
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

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
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

export async function tryRefreshToken(): Promise<boolean> {
  return refreshToken();
}

export async function req<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Merge caller-supplied headers first so auth/content-type always win,
  // but callers can still inject extra headers (e.g. X-Recaptcha-Token).
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (tokens.access) headers["Authorization"] = `Bearer ${tokens.access}`;

  const url = `${BASE}${endpoint}`;
  const res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${tokens.access}`;
      const retry = await fetch(url, { ...options, headers, credentials: "include" });
      const retryData = await retry.json().catch(() => ({}));
      if (!retry.ok) throw new ApiError(retry.status, extractMessage(retryData));
      return retryData as T;
    }
    tokens.clear();
    dispatchSessionExpired();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, extractMessage(data));
  return data as T;
}

export function buildQuery(params: Record<string, unknown>): string {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Record<string, string>;
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
}
