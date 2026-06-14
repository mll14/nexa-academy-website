import { cn } from '@/lib/utils'
import type { InstructorNoteData } from '@/types'

const CONFIG = {
  info: {
    icon: 'ℹ️',
    label: 'Info',
    className: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
    titleClass: 'text-blue-700 dark:text-blue-400',
  },
  tip: {
    icon: '💡',
    label: 'Tip',
    className: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
    titleClass: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    icon: '⚠️',
    label: 'Warning',
    className: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
    titleClass: 'text-amber-700 dark:text-amber-500',
  },
  important: {
    icon: '🔑',
    label: 'Important',
    className: 'border-primary/30 bg-primary/5',
    titleClass: 'text-primary',
  },
  instructor: {
    icon: '👨‍🏫',
    label: 'Instructor Note',
    className: 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30',
    titleClass: 'text-violet-700 dark:text-violet-400',
  },
} satisfies Record<string, { icon: string; label: string; className: string; titleClass: string }>

export function InstructorNote({ value }: { value: InstructorNoteData }) {
  const config = CONFIG[value.type] ?? CONFIG.info

  return (
    <div className={cn('my-8 rounded-xl border px-5 py-4', config.className)}>
      <p className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2', config.titleClass)}>
        <span>{config.icon}</span>
        {value.title ?? config.label}
      </p>
      <p className="text-[0.9375rem] text-foreground/80 leading-relaxed whitespace-pre-line">
        {value.content}
      </p>
    </div>
  )
}
