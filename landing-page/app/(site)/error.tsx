'use client'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-destructive">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-sm">{error.message}</p>
      <button
        className="text-sm text-primary hover:underline"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  )
}
