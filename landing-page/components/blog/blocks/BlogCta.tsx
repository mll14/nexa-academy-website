import { cn } from '@/lib/utils'
import type { BlogCtaData } from '@/types'

export function BlogCta({ value }: { value: BlogCtaData }) {
  const isSafe = /^https?:\/\//i.test(value.buttonUrl) || value.buttonUrl.startsWith('/')
  if (!isSafe) return null

  const style = value.style ?? 'primary'

  return (
    <div
      className={cn(
        'my-10 rounded-2xl border p-8 text-center',
        style === 'primary' && 'bg-primary border-primary/20 text-primary-foreground',
        style === 'subtle' && 'bg-muted border-border',
        style === 'dark' && 'bg-foreground border-foreground/20 text-background',
      )}
    >
      <h3 className={cn(
        'text-lg font-bold mb-2',
        style === 'primary' && 'text-primary-foreground',
        style === 'subtle' && 'text-foreground',
        style === 'dark' && 'text-background',
      )}>
        {value.title}
      </h3>
      {value.description && (
        <p className={cn(
          'text-sm mb-6',
          style === 'primary' && 'text-primary-foreground/80',
          style === 'subtle' && 'text-muted-foreground',
          style === 'dark' && 'text-background/70',
        )}>
          {value.description}
        </p>
      )}
      <a
        href={value.buttonUrl}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85',
          style === 'primary' && 'bg-primary-foreground text-primary',
          style === 'subtle' && 'bg-primary text-primary-foreground',
          style === 'dark' && 'bg-background text-foreground',
        )}
      >
        {value.buttonText}
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  )
}
