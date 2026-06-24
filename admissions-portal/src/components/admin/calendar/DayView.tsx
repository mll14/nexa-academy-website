import { useEffect, useRef } from 'react'
import { EventChip } from './EventChip'
import type { CalendarEvent } from '../../../lib/calendarService'

const SLOT_HEIGHT = 44
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2

function positionStyle(event: CalendarEvent) {
  const start = new Date(event.start)
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + 30 * 60000)
  const offsetMin = (start.getHours() - START_HOUR) * 60 + start.getMinutes()
  const durationMin = (end.getTime() - start.getTime()) / 60000
  return {
    top: Math.max(0, (offsetMin / 30) * SLOT_HEIGHT),
    height: Math.max((durationMin / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.6),
  }
}

function getNowOffset(): number | null {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  if (h < START_HOUR || h >= END_HOUR) return null
  return ((h - START_HOUR) * 60 + m) / 30 * SLOT_HEIGHT
}

interface Props {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function DayView({ date, events, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowRef = useRef<HTMLDivElement>(null)

  const allDay = events.filter((e) => e.all_day)
  const timed = events.filter((e) => !e.all_day)
  const isToday = date.toDateString() === new Date().toDateString()
  const nowOffset = isToday ? getNowOffset() : null

  // Scroll so "now" (or 9am) is visible on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const targetPx = nowOffset != null
      ? nowOffset - el.clientHeight / 3
      : ((9 - START_HOUR) * 2) * SLOT_HEIGHT
    el.scrollTop = Math.max(0, targetPx)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const h = START_HOUR + Math.floor(i / 2)
    const isHour = i % 2 === 0
    return { label: isHour ? `${String(h).padStart(2, '0')}:00` : '', isHour }
  })

  return (
    // h-full fills the parent which is overflow-hidden — this div must not overflow
    <div className="h-full flex flex-col overflow-hidden">
      {/* All-day strip — fixed at top */}
      {allDay.length > 0 && (
        <div className="shrink-0 border-b border-border px-3 py-1.5 space-y-0.5 bg-muted/20">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">All day</p>
          {allDay.map((ev) => <EventChip key={ev.id} event={ev} onClick={onEventClick} />)}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="relative" style={{ height: SLOT_HEIGHT * TOTAL_SLOTS }}>
          {/* Hour / half-hour lines + labels */}
          {slots.map(({ label, isHour }, i) => (
            <div
              key={i}
              style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              className={`absolute inset-x-0 flex items-start ${isHour ? 'border-t border-border/50' : 'border-t border-border/15'}`}
            >
              <span className="text-[10px] text-muted-foreground w-11 shrink-0 mt-0.5 ml-1.5 select-none font-medium">
                {label}
              </span>
            </div>
          ))}

          {/* Now line */}
          {nowOffset !== null && (
            <div
              ref={nowRef}
              style={{ top: nowOffset, left: 44, right: 4, position: 'absolute', zIndex: 10 }}
              className="flex items-center pointer-events-none"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          )}

          {/* Timed events */}
          {timed.map((ev) => {
            const { top, height } = positionStyle(ev)
            return (
              <div
                key={ev.id}
                style={{ top, height, left: 48, right: 4, position: 'absolute' }}
                className="pr-0.5 py-0.5"
              >
                <EventChip event={ev} onClick={onEventClick} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
