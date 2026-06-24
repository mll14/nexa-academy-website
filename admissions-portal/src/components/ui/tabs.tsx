import { cn } from '../../lib/utils'

interface TabsProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'capitalize rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
            active === tab
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border bg-background hover:bg-muted text-foreground',
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

interface UnderlineTabsProps {
  tabs: { value: string; label: string }[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export function UnderlineTabs({ tabs, active, onChange, className }: UnderlineTabsProps) {
  return (
    <div className={cn('flex gap-0 border-b border-border overflow-y-hidden', className)}>
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            active === value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
