import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function statusText(slug) {
  if (!slug && slug !== 0) return "—";
  const mapping = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    enrolled: "Enrolled",
    interview_scheduled: "Interview scheduled",
    interview_completed: "Interview completed",
    processed: "Processed",
    paid: "Paid",
  };
  const key = String(slug).trim();
  if (mapping[key]) return mapping[key];
  // Fallback: replace underscores and capitalize words
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
