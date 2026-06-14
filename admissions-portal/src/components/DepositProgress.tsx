import { cn } from '../lib/utils'

interface Props {
  depositedAmount: number
  applicationStatus: string
  totalFee?: number
}

const DEPOSIT_THRESHOLD = 10_000

export function DepositProgress({ depositedAmount, applicationStatus, totalFee }: Props) {
  const threshold =
    applicationStatus === 'enrolled' && totalFee ? totalFee : DEPOSIT_THRESHOLD

  const pct = Math.min(100, Math.round((depositedAmount / threshold) * 100))
  const reached = depositedAmount >= threshold

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {applicationStatus === 'enrolled' ? 'Fees paid' : 'Deposit progress'}
        </span>
        <span className={cn('font-semibold', reached ? 'text-success' : 'text-foreground')}>
          KSh {depositedAmount.toLocaleString()} / {threshold.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            reached ? 'bg-success' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {reached && (
        <p className="text-xs text-success font-medium">
          ✓ Deposit threshold reached
        </p>
      )}
      {!reached && (
        <p className="text-xs text-muted-foreground">
          KSh {(threshold - depositedAmount).toLocaleString()} remaining to unlock enrollment
        </p>
      )}
    </div>
  )
}
