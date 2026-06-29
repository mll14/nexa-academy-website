import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ApplicationStatus } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusText(status: string | undefined | null): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    pending: "Pending",
    reviewed: "Reviewed",
    not_reached: "Not Responding",
    approved: "Approved",
    rejected: "Rejected",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    enrolled: "Enrolled",
    completed: "Completed",
    failed: "Failed",
    open: "Open",
    closed: "Closed",
    draft: "Draft",
  };
  return (
    map[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function statusBadgeClass(status: ApplicationStatus | string): string {
  const map: Record<string, string> = {
    enrolled: "bg-success/10 text-success",
    approved: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    not_reached: "bg-warning/10 text-warning",
    rejected: "bg-destructive/10 text-destructive",
    interview_scheduled: "bg-primary/10 text-primary",
    interview_completed: "bg-primary/15 text-primary",
    reviewed: "bg-secondary text-secondary-foreground",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

export function formatDate(
  iso: string | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(
      "en-KE",
      opts ?? { day: "numeric", month: "short", year: "numeric" },
    );
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-KE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatFullDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function calcFee(base: number, plan: string): number {
  if (!base) return 0;
  const normalized = (plan || "").toLowerCase();
  if (!normalized || normalized === "full" || normalized.includes("one-time"))
    return base;
  if (normalized === "installment3" || normalized.includes("3"))
    return Math.round((base * 1.2) / 3 / 500) * 500 * 3;
  if (normalized === "installment2" || normalized.includes("2"))
    return Math.round((base * 1.1) / 2 / 500) * 500 * 2;
  return base;
}
