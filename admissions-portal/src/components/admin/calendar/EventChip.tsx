import type { CalendarEvent } from '../../../lib/calendarService'

const CATEGORY_STYLES: Record<string, string> = {
  interview_follow_up: 'bg-blue-500/10 text-blue-700 border-blue-300/40 dark:text-blue-400',
  lead_follow_up:      'bg-emerald-500/10 text-emerald-700 border-emerald-300/40 dark:text-emerald-400',
  personal:            'bg-violet-500/10 text-violet-700 border-violet-300/40 dark:text-violet-400',
  meeting:             'bg-amber-500/10 text-amber-700 border-amber-300/40 dark:text-amber-400',
  other:               'bg-slate-500/10 text-slate-600 border-slate-300/40 dark:text-slate-400',
}

const TYPE_STYLES: Record<string, string> = {
  interview: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
  intake:    'bg-secondary text-secondary-foreground border border-border hover:bg-accent',
  external:  'bg-muted text-muted-foreground border border-border hover:bg-accent',
  blackout:  'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20',
}

interface Props {
  event: CalendarEvent
  onClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function EventChip({ event, onClick }: Props) {
  const timeStr = event.all_day
    ? ''
    : new Date(event.start).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })

  const className = event.type === 'custom'
    ? `w-full text-left text-xs rounded px-1.5 py-0.5 truncate transition-colors border ${CATEGORY_STYLES[event.meta?.category ?? 'other'] ?? CATEGORY_STYLES.other} hover:opacity-80`
    : `w-full text-left text-xs rounded px-1.5 py-0.5 truncate transition-colors ${TYPE_STYLES[event.type] ?? TYPE_STYLES.external}`

  return (
    <button onClick={(e) => onClick(event, e)} className={className} title={event.title}>
      {timeStr && <span className="font-semibold mr-1">{timeStr}</span>}
      {event.title}
    </button>
  )
}
