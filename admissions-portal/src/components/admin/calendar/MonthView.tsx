import { useState } from 'react'
import { EventChip } from './EventChip'
import type { CalendarEvent } from '../../../lib/calendarService'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE = 4

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
    <div className="flex flex-col flex-1">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            className="text-center py-3 text-xs font-semibold text-muted-foreground tracking-wide uppercase"
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentMonth
          const isToday = d.toDateString() === today
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          const dateKey = d.toDateString()
          const dayEvents = eventsOnDay(events, d)
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const overflow = dayEvents.length - MAX_VISIBLE
          const isExpanded = expanded === dateKey

          return (
            <div
              key={i}
              className={[
                'min-h-[140px] border-b border-r border-border p-2 transition-colors',
                !isCurrentMonth ? 'bg-muted/20' : isWeekend ? 'bg-muted/5' : '',
              ].join(' ')}
            >
              {/* Date number */}
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={[
                    'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                    isToday
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/40',
                  ].join(' ')}
                >
                  {d.getDate()}
                </span>
                {dayEvents.length > 0 && isCurrentMonth && (
                  <span className="text-[10px] text-muted-foreground font-medium">
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
                    className="text-[10px] text-primary hover:text-primary/80 font-medium hover:underline block pl-1"
                  >
                    +{overflow} more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setExpanded(null)}
                    className="text-[10px] text-muted-foreground hover:underline block pl-1"
                  >
                    show less
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
