import { useState } from 'react'
import { EventChip } from './EventChip'
import type { CalendarEvent } from '../../../lib/calendarService'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE = 3

function getMonthGrid(cursor: Date): Date[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const startPad = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - startPad)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

function eventsOnDay(events: CalendarEvent[], d: Date): CalendarEvent[] {
  return events.filter((ev) => {
    if (ev.all_day) {
      const evStart = new Date(ev.start); evStart.setHours(0, 0, 0, 0)
      const evEnd = new Date(ev.end ?? ev.start); evEnd.setHours(23, 59, 59, 999)
      const dMid = new Date(d); dMid.setHours(12)
      return dMid >= evStart && dMid <= evEnd
    }
    return new Date(ev.start).toDateString() === d.toDateString()
  })
}

interface Props {
  cursor: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function MonthView({ cursor, events, onEventClick }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const cells = getMonthGrid(cursor)
  const currentMonth = cursor.getMonth()
  const today = new Date().toDateString()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 shrink-0">
        {DAY_LABELS.map((l, i) => (
          <div
            key={l}
            className={`text-center py-2.5 text-[11px] font-semibold tracking-wide uppercase
              ${i >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day cells — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentMonth
          const isToday = d.toDateString() === today
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          const isPast = !isToday && d < new Date(new Date().setHours(0, 0, 0, 0))
          const dateKey = d.toDateString()
          const dayEvents = eventsOnDay(events, d)
          const hasBlackout = dayEvents.some((ev) => ev.type === 'blackout')
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const overflow = dayEvents.length - MAX_VISIBLE
          const isExpanded = expanded === dateKey

          return (
            <div
              key={i}
              className={[
                'min-h-[110px] border-b border-r border-border/60 p-1.5 transition-colors',
                !isCurrentMonth
                  ? 'bg-muted/15'
                  : hasBlackout
                  ? 'bg-destructive/[0.03]'
                  : isWeekend
                  ? 'bg-muted/5'
                  : isPast
                  ? 'bg-muted/5'
                  : 'bg-background',
              ].join(' ')}
            >
              {/* Date number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={[
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all',
                    isToday
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCurrentMonth
                      ? isPast
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                      : 'text-muted-foreground/25',
                  ].join(' ')}
                >
                  {d.getDate()}
                </span>
                {dayEvents.length > 0 && isCurrentMonth && (
                  <span className="text-[9px] text-muted-foreground/60 font-medium pr-0.5">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {(isExpanded ? dayEvents : visible).map((ev) => (
                  <EventChip key={ev.id} event={ev} onClick={onEventClick} />
                ))}
                {!isExpanded && overflow > 0 && (
                  <button
                    onClick={() => setExpanded(dateKey)}
                    className="text-[9px] text-primary hover:text-primary/80 font-semibold hover:underline block pl-1 leading-tight"
                  >
                    +{overflow} more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setExpanded(null)}
                    className="text-[9px] text-muted-foreground hover:underline block pl-1 leading-tight"
                  >
                    less
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
