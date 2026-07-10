import { CheckCircle2, Copy, Smartphone, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { PAYMENT_INFO } from '../lib/paymentInfo'

function CopyableField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value)
          toast.success(`${label} copied`)
        }}
        className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-primary transition-colors"
        title={`Copy ${label}`}
      >
        {value}
        <Copy className="w-3.5 h-3.5 opacity-50" />
      </button>
    </div>
  )
}

/**
 * Descriptive "how to pay" panel shared by the student portal and admin dashboard.
 * Paystack is framed as the primary method because it reconciles the payment and
 * emails the receipt automatically; the M-Pesa Paybill block is the offline fallback.
 *
 * `showOnline` hides the Paystack option in contexts where paying online isn't the
 * point (e.g. an admin recording a Paybill payment a student already made).
 */
export function PaymentInstructions({ showOnline = true }: { showOnline?: boolean }) {
  return (
    <div className="space-y-3">
      {showOnline && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Pay online with Paystack</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              Recommended
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use the <strong>Pay</strong> tab to pay by M-Pesa or card through Paystack. It's the
            fastest and safest option — your balance updates instantly, the payment is reconciled
            automatically, and your receipt and invoice are emailed to you the moment it clears.
            No confirmation message needed.
          </p>
          <ul className="mt-2 space-y-1">
            {['Instant confirmation', 'Automatic receipt & invoice by email', 'No manual review'].map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">M-Pesa Paybill (Lipa na M-Pesa)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          On your phone: <em>M-Pesa → Lipa na M-Pesa → Pay Bill</em>, then enter the details below
          and the amount you wish to pay.
        </p>
        <div className="mt-3 rounded-lg border bg-background px-3 divide-y">
          <CopyableField label={`Business No. (Paybill · ${PAYMENT_INFO.bank})`} value={PAYMENT_INFO.paybill} />
          <CopyableField label="Account No." value={PAYMENT_INFO.accountNumber} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Funds are received by <strong>{PAYMENT_INFO.accountName}</strong>. After paying by Paybill,
          bank transfer or cash, submit the confirmation message under <strong>Record Payment</strong>{' '}
          so we can post it to your account.
        </p>
      </div>
    </div>
  )
}
