// Off-platform payment coordinates (M-Pesa Lipa na M-Pesa Paybill, settled via KCB).
// Single source of truth for the student portal and admin dashboard so the Paybill
// and account numbers can never drift between screens. Mirrors the backend
// PAYMENT_MPESA_* settings used on invoices, receipts and statements.
export const PAYMENT_INFO = {
  paybill: '522522',
  bank: 'KCB',
  accountNumber: '1316088286',
  accountName: 'Moonlight Software Systems',
} as const
