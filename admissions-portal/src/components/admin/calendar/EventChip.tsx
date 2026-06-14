import type { CalendarEvent } from '../../../lib/calendarService'

const TYPE_STYLES: Record<string, string> = {
  interview: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
  intake:    'bg-secondary text-secondary-foreground border border-border hover:bg-accent',
  external:  'bg-muted text-muted-foreground border border-border hover:bg-accent',
}

interface Props {
  event: CalendarEvent
  onClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function EventChip({ event, onClick }: Props) {
  const timeStr = event.all_day
    ? ''
    : new Date(event.start).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <button
      onClick={(e) => onClick(event, e)}
      className={`w-full text-left text-xs rounded px-1.5 py-0.5 truncate transition-colors ${TYPE_STYLES[event.type] ?? TYPE_STYLES.external}`}
      title={event.title}
    >
      {timeStr && <span className="font-semibold mr-1">{timeStr}</span>}
      {event.title}
    </button>
  )
}
