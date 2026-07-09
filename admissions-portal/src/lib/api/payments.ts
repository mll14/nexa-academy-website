import type { Payment, PaymentPlanChangeRequest, ManualPaymentRequest, FinancialReconciliation, ApiFilters } from "../../types";
import { req, buildQuery } from "./core";

export interface PaymentStats {
  total_count: number;
  completed_count: number;
  pending_count: number;
  total_revenue: string | number;
}

export async function getPayments(filters: ApiFilters = {}): Promise<Payment[]> {
  const res = await req<{ results: Payment[] } | Payment[]>(`/payments/${buildQuery(filters)}`);
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function getPaymentStats(): Promise<PaymentStats> {
  return req<PaymentStats>("/payments/stats/");
}

export async function getFinancialReconciliation(
  studentId?: string,
): Promise<FinancialReconciliation> {
  return req<FinancialReconciliation>(
    `/payments/reconciliation/${buildQuery(studentId ? { student: studentId } : {})}`,
  );
}

export async function getPaymentPlanRequests(
  filters: ApiFilters = {},
): Promise<PaymentPlanChangeRequest[]> {
  const res = await req<{ results: PaymentPlanChangeRequest[] } | PaymentPlanChangeRequest[]>(
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
}): Promise<{
  payment_id: string;
  reference: string;
  access_code: string;
  authorization_url: string;
  public_key: string;
  student_email: string;
  amount: string;
}> {
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

// ─── Manual reconciliation ──────────────────────────────────────────────────

/**
 * Record an off-platform payment. Identify the payer with `studentUid` when the
 * account is known, or `applicationId` when working from an application whose
 * account the server resolves by FK or email.
 */
export async function recordManualPayment(data: {
  studentUid?: string;
  applicationId?: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  reference?: string;
  providerMessage?: string;
  programId?: string | null;
  description?: string;
}): Promise<Payment> {
  return req<Payment>("/payments/record_manual/", {
    method: "POST",
    body: JSON.stringify({
      student_uid: data.studentUid,
      application_id: data.applicationId,
      amount: data.amount,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      reference: data.reference ?? "",
      provider_message: data.providerMessage ?? "",
      program_id: data.programId ?? null,
      description: data.description ?? "",
    }),
  });
}

/** Re-send the PDF invoice email for a completed payment. */
export async function sendPaymentInvoice(
  paymentId: string,
): Promise<{ detail: string; recipients: string[] }> {
  return req(`/payments/${paymentId}/send_invoice/`, { method: "POST" });
}

export async function getManualPaymentRequests(
  filters: ApiFilters = {},
): Promise<ManualPaymentRequest[]> {
  const res = await req<{ results: ManualPaymentRequest[] } | ManualPaymentRequest[]>(
    `/manual-payment-requests/${buildQuery(filters)}`,
  );
  return Array.isArray(res) ? res : (res.results ?? []);
}

export async function createManualPaymentRequest(data: {
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  providerMessage: string;
  programId?: string | null;
}): Promise<ManualPaymentRequest> {
  return req<ManualPaymentRequest>("/manual-payment-requests/", {
    method: "POST",
    body: JSON.stringify({
      amount: data.amount,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      reference: data.reference ?? "",
      provider_message: data.providerMessage,
      program_id: data.programId ?? null,
    }),
  });
}

export async function approveManualPaymentRequest(
  requestId: string,
  data: { adminNotes?: string } = {},
): Promise<ManualPaymentRequest> {
  return req<ManualPaymentRequest>(`/manual-payment-requests/${requestId}/approve/`, {
    method: "POST",
    body: JSON.stringify({ admin_notes: data.adminNotes ?? "" }),
  });
}

export async function rejectManualPaymentRequest(
  requestId: string,
  data: { adminNotes?: string } = {},
): Promise<ManualPaymentRequest> {
  return req<ManualPaymentRequest>(`/manual-payment-requests/${requestId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ admin_notes: data.adminNotes ?? "" }),
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

export async function backfillEnrollments(): Promise<{ enrolled_count: number }> {
  return req("/payments/backfill_enrollments/", { method: "POST" });
}

export async function getPaystackPublicKey(): Promise<string> {
  return import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "";
}
