import { tokens, setStoredUser } from "../auth";
import type { User } from "../../types";
import type {
  AppPermission, Role, StaffUser,
  AccountCredentials, Guardian, NotificationPreferences,
} from "../../types";
import { req, ApiError, BASE } from "./core";
import { isKeycloak } from "../../config/authProvider";

// Option 3: in Keycloak mode the same custom UI posts to the Django BFF endpoints, which
// broker Keycloak. In django mode it uses the native auth endpoints. Response shapes match.
const LOGIN_URL = isKeycloak ? "/auth/keycloak/login/" : "/auth/login/";
const TWOFA_COMPLETE_URL = isKeycloak ? "/auth/keycloak/2fa/complete/" : "/auth/2fa/complete-login/";
const LOGOUT_URL = isKeycloak ? "/auth/keycloak/logout/" : "/auth/logout/";

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<User> {
  return req<User>("/auth/profile/");
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  return req<User>("/auth/profile/", { method: "PUT", body: JSON.stringify(data) });
}

/**
 * Self-service profile update.
 *
 * `email` and the name parts are authentication facts in Keycloak (email doubles as the
 * username), so the server pushes them there before committing — a 502 here means the
 * change was rejected upstream and nothing was saved.
 */
export async function updateMyProfile(data: Partial<{
  email: string;
  photo_url: string;
  google_linked: boolean;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  phone: string;
  alt_phone: string;
  country: string;
  county: string;
  city: string;
  postal_address: string;
}>): Promise<User> {
  return req<User>("/auth/my-profile/", { method: "PATCH", body: JSON.stringify(data) });
}

export async function uploadPhoto(file: File): Promise<{ photo_url: string }> {
  const form = new FormData();
  form.append("photo", file);
  return req<{ photo_url: string }>("/auth/upload-photo/", { method: "POST", body: form });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  await req("/auth/forgot-password/", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPassword(uid: string, token: string, password: string): Promise<void> {
  await req("/auth/reset-password/", { method: "POST", body: JSON.stringify({ uid, token, password }) });
}

export type LoginResult =
  | { user: User; role: string }
  | { requires_2fa: true; temp_token: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await req<{ access: string } | { requires_2fa: true; temp_token: string }>(
    LOGIN_URL,
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  if ("requires_2fa" in res && res.requires_2fa) {
    return { requires_2fa: true, temp_token: res.temp_token };
  }
  const { access } = res as { access: string };
  tokens.setAccess(access);
  const profile = await getProfile();
  setStoredUser(profile);
  return { user: profile, role: profile.role };
}

export async function completeTwoFALogin(
  temp_token: string,
  code: string,
): Promise<{ user: User }> {
  const res = await req<{ access: string }>(TWOFA_COMPLETE_URL, {
    method: "POST",
    body: JSON.stringify({ temp_token, code }),
  });
  tokens.setAccess(res.access);
  const profile = await getProfile();
  setStoredUser(profile);
  return { user: profile };
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ user: User } | { requires_2fa: true; temp_token: string }> {
  const res = await req<{ access: string } | { requires_2fa: true; temp_token: string }>(
    LOGIN_URL,
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  if ("requires_2fa" in res && res.requires_2fa) {
    return { requires_2fa: true, temp_token: res.temp_token };
  }
  const { access } = res as { access: string };
  tokens.setAccess(access);
  const profile = await getProfile();
  if (profile.role !== "admin") {
    tokens.clear();
    throw new ApiError(403, "User is not an administrator");
  }
  setStoredUser(profile);
  return { user: profile };
}

export type GoogleLoginResult = { user: User } | { requires_2fa: true; temp_token: string };

export async function googleLogin(googleToken: string): Promise<GoogleLoginResult> {
  const res = await req<{ access: string; user?: User } | { requires_2fa: true; temp_token: string }>(
    "/auth/login/google/",
    { method: "POST", body: JSON.stringify({ google_token: googleToken }) },
  );
  if ("requires_2fa" in res && res.requires_2fa) {
    return { requires_2fa: true, temp_token: res.temp_token };
  }
  const { access } = res as { access: string; user?: User };
  tokens.setAccess(access);
  const profile = (res as { user?: User }).user ?? (await getProfile());
  setStoredUser(profile);
  return { user: profile };
}

export async function logout(): Promise<void> {
  try {
    await req(LOGOUT_URL, { method: "POST", body: JSON.stringify({}) });
  } finally {
    tokens.clear();
  }
}

/**
 * Change (or, for social-only accounts, set) the password.
 *
 * `currentPassword` is omitted when the account has no password credential yet — the
 * server confirms that against Keycloak rather than trusting the client.
 */
export async function changePassword(
  currentPassword: string | null,
  newPassword: string,
): Promise<void> {
  await req("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({
      ...(currentPassword ? { current_password: currentPassword } : {}),
      new_password: newPassword,
    }),
  });
}

export async function getAccountCredentials(): Promise<AccountCredentials> {
  return req<AccountCredentials>("/auth/account/credentials/");
}

// ── Guardians ─────────────────────────────────────────────────────────────────

export type GuardianInput = Omit<
  Guardian,
  "id" | "relationship_display" | "created_at" | "updated_at"
>;

export async function getGuardians(): Promise<Guardian[]> {
  const res = await req<Guardian[] | { results: Guardian[] }>("/auth/guardians/");
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createGuardian(data: Partial<GuardianInput>): Promise<Guardian> {
  return req<Guardian>("/auth/guardians/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateGuardian(
  id: string,
  data: Partial<GuardianInput>,
): Promise<Guardian> {
  return req<Guardian>(`/auth/guardians/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteGuardian(id: string): Promise<void> {
  await req(`/auth/guardians/${id}/`, { method: "DELETE" });
}

// ── Notification preferences ──────────────────────────────────────────────────

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return req<NotificationPreferences>("/auth/notification-preferences/");
}

export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return req<NotificationPreferences>("/auth/notification-preferences/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Account controls ──────────────────────────────────────────────────────────

export async function exportMyAccount(): Promise<Blob> {
  // The export endpoint sets a download disposition; fetch it as a blob to save to file.
  const res = await fetch(`${BASE}/auth/account/export/`, {
    headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("Could not export your account data.");
  return res.blob();
}

export async function deactivateMyAccount(password?: string): Promise<void> {
  await req("/auth/account/deactivate/", {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });
}

export async function deleteMyAccount(password?: string): Promise<void> {
  await req("/auth/account/", {
    method: "DELETE",
    body: JSON.stringify(password ? { password } : {}),
  });
}

// ── 2FA ───────────────────────────────────────────────────────────────────────

export interface TwoFAStatus {
  enabled: boolean;
}

export interface TwoFASetup {
  secret: string;
  qr_image: string;
  otpauth_url: string;
}

export async function get2FAStatus(): Promise<TwoFAStatus> {
  return req<TwoFAStatus>("/auth/2fa/status/");
}

export async function setup2FA(): Promise<TwoFASetup> {
  return req<TwoFASetup>("/auth/2fa/setup/", { method: "POST" });
}

export async function verify2FA(code: string): Promise<TwoFAStatus> {
  return req<TwoFAStatus>("/auth/2fa/verify/", { method: "POST", body: JSON.stringify({ code }) });
}

export async function disable2FA(code: string): Promise<TwoFAStatus> {
  return req<TwoFAStatus>("/auth/2fa/disable/", { method: "POST", body: JSON.stringify({ code }) });
}

// ── Login sessions ────────────────────────────────────────────────────────────

export interface LoginSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  is_current: boolean;
}

export async function getLoginSessions(): Promise<LoginSession[]> {
  const res = await req<LoginSession[] | { results: LoginSession[] }>("/auth/sessions/");
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function revokeLoginSession(id: string): Promise<void> {
  await req(`/auth/sessions/${id}/revoke/`, { method: "POST" });
}

/** Terminates every session, including the current one — the caller must then sign out. */
export async function logoutAllSessions(): Promise<void> {
  await req("/auth/sessions/logout-all/", { method: "POST" });
}

// ── Roles & Permissions ───────────────────────────────────────────────────────

export async function getPermissions(): Promise<AppPermission[]> {
  return req<AppPermission[]>("/auth/permissions/");
}

export async function createPermission(data: {
  codename: string;
  name: string;
  resource: string;
  action: string;
}): Promise<AppPermission> {
  return req<AppPermission>("/auth/permissions/", { method: "POST", body: JSON.stringify(data) });
}

export async function getRoles(): Promise<Role[]> {
  return req<Role[]>("/auth/roles/");
}

export async function getRole(id: number): Promise<Role> {
  return req<Role>(`/auth/roles/${id}/`);
}

export async function createRole(data: {
  name: string;
  slug: string;
  description?: string;
  permission_ids?: number[];
}): Promise<Role> {
  return req<Role>("/auth/roles/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateRole(
  id: number,
  data: { name?: string; description?: string; permission_ids?: number[] },
): Promise<Role> {
  return req<Role>(`/auth/roles/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteRole(id: number): Promise<void> {
  await req(`/auth/roles/${id}/`, { method: "DELETE" });
}

// ── Staff users ───────────────────────────────────────────────────────────────

export async function getStudentDetail(uid: string): Promise<{
  user: User;
  applications: import("../../types").Application[];
  payments: import("../../types").Payment[];
  enrollments: import("../../types").Enrollment[];
  reconciliation?: import("../../types").FinancialReconciliation;
}> {
  return req(`/auth/students/${uid}/`);
}

export async function getStudents(
  filters: Record<string, unknown> = {},
): Promise<import("../../types").PaginatedResponse<User>> {
  const { buildQuery } = await import("./core");
  const res = await req<import("../../types").PaginatedResponse<User> | User[]>(
    `/auth/users/${buildQuery(filters)}`,
  );
  if (Array.isArray(res))
    return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export async function getStaffUsers(): Promise<StaffUser[]> {
  return req<StaffUser[]>("/auth/staff/");
}

export async function getStaffUser(uid: string): Promise<StaffUser> {
  return req<StaffUser>(`/auth/staff/${uid}/`);
}

export async function createStaffUser(data: {
  email: string;
  display_name: string;
  staff_role_id?: number;
}): Promise<StaffUser> {
  return req<StaffUser>("/auth/staff/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStaffUser(
  uid: string,
  data: { staff_role_id?: number | null; individual_permission_ids?: number[]; status?: string },
): Promise<StaffUser> {
  return req<StaffUser>(`/auth/staff/${uid}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function removeStaffUser(uid: string): Promise<void> {
  await req(`/auth/staff/${uid}/`, { method: "DELETE" });
}

export async function resendInvite(uid: string): Promise<void> {
  await req(`/auth/staff/${uid}/resend_invite/`, { method: "POST" });
}

export async function acceptInvite(data: {
  uid: string;
  token: string;
  display_name: string;
  password: string;
}): Promise<{ user: User; access: string }> {
  return req("/auth/accept-invite/", { method: "POST", body: JSON.stringify(data) });
}

// ── Audit logs ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  action: string;
  action_display: string;
  resource_type: string;
  resource_id: string;
  resource_summary: Record<string, string | null>;
  ip_address: string | null;
  created_at: string;
  performed_by: { uid: string; display_name: string; email: string } | null;
}

export interface AuditLogFilters {
  action?: string;
  user?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
}

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== "")),
  ).toString();
  return req<AuditLogEntry[]>(`/auth/audit-logs/${params ? `?${params}` : ""}`);
}
