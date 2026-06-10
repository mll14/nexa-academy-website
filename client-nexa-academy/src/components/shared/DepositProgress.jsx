const DEPOSIT_TARGET = 10_000;

/**
 * Shows deposit progress toward KSh 10,000 (interview_completed phase)
 * or remaining program fee balance (enrolled phase).
 *
 * Props:
 *   depositedAmount  — total KSh received (completed payments only)
 *   applicationStatus — "interview_completed" | "enrolled" | other
 *   totalFee         — full program fee (used for enrolled balance bar)
 */
export default function DepositProgress({ depositedAmount = 0, applicationStatus, totalFee = 0 }) {
  const deposited = Number(depositedAmount) || 0;
  const isEnrolled = applicationStatus === "enrolled";
  const isInterviewCompleted = applicationStatus === "interview_completed";

  if (!isInterviewCompleted && !isEnrolled) return null;

  if (isEnrolled && totalFee > 0) {
    const paidPct = Math.min(100, Math.round((deposited / totalFee) * 100));
    const remaining = Math.max(0, totalFee - deposited);
    const fullyPaid = remaining <= 0;
    return (
      <div className="rounded-xl border border-border p-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Program Fee</span>
          <span className="text-muted-foreground">
            KSh {deposited.toLocaleString()} / KSh {totalFee.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{paidPct}% paid</span>
          {fullyPaid ? (
            <span className="text-green-600 font-semibold">Fully settled ✓</span>
          ) : (
            <span className="font-medium text-foreground">
              KSh {remaining.toLocaleString()} remaining
            </span>
          )}
        </div>
      </div>
    );
  }

  // interview_completed — deposit phase
  const capped = Math.min(deposited, DEPOSIT_TARGET);
  const pct = Math.round((capped / DEPOSIT_TARGET) * 100);
  const remaining = Math.max(0, DEPOSIT_TARGET - deposited);
  const depositComplete = deposited >= DEPOSIT_TARGET;

  return (
    <div
      className={`rounded-xl border p-4 space-y-2.5 ${
        depositComplete ? "border-green-200 bg-green-50/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Initial Deposit</span>
        <span
          className={
            depositComplete ? "text-green-600 font-semibold" : "text-muted-foreground"
          }
        >
          {pct}%
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            depositComplete ? "bg-green-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          KSh {deposited.toLocaleString()} of KSh {DEPOSIT_TARGET.toLocaleString()}
        </span>
        {depositComplete ? (
          <span className="text-green-600 font-semibold">Complete ✓</span>
        ) : (
          <span className="font-medium text-foreground">
            KSh {remaining.toLocaleString()} to go
          </span>
        )}
      </div>
      {depositComplete && (
        <p className="text-xs text-green-700 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
          Deposit received — your enrollment will be confirmed shortly.
        </p>
      )}
    </div>
  );
}
