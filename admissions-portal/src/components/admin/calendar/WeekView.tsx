import { useEffect, useRef } from 'react'
import { EventChip } from './EventChip'
import type { CalendarEvent } from '../../../lib/calendarService'

const SLOT_HEIGHT = 44
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2

function getWeekDays(cursor: Date): Date[] {
  const monday = new Date(cursor)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

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
  const h = now.getHours(); const m = now.getMinutes()
  if (h < START_HOUR || h >= END_HOUR) return null
  return ((h - START_HOUR) * 60 + m) / 30 * SLOT_HEIGHT
}

interface Props {
  cursor: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function WeekView({ cursor, events, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days = getWeekDays(cursor)
  const allDay = events.filter((e) => e.all_day)
  const timed = events.filter((e) => !e.all_day)
  const today = new Date().toDateString()
  const todayColIdx = days.findIndex((d) => d.toDateString() === today)
  const nowOffset = getNowOffset()

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const targetPx = nowOffset != null
      ? nowOffset - el.clientHeight / 3
      : ((9 - START_HOUR) * 2) * SLOT_HEIGHT
    el.scrollTop = Math.max(0, targetPx)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const COL = '44px repeat(7, 1fr)'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Day headers — fixed */}
      <div className="grid shrink-0 border-b border-border bg-background z-10" style={{ gridTemplateColumns: COL }}>
        <div className="border-r border-border/30" />
        {days.map((d) => {
          const isToday = d.toDateString() === today
          const count = timed.filter((ev) => new Date(ev.start).toDateString() === d.toDateString()).length
          return (
            <div key={d.toISOString()} className="text-center py-2 border-r border-border/20 last:border-r-0">
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {d.toLocaleDateString('en-KE', { weekday: 'short' })}
              </div>
              <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center mx-auto rounded-full mt-0.5 ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {d.getDate()}
              </div>
              {count > 0 && <div className="flex justify-center mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /></div>}
            </div>
          )
        })}
      </div>

      {/* All-day row — fixed */}
      {allDay.length > 0 && (
        <div className="grid shrink-0 border-b border-border bg-muted/20" style={{ gridTemplateColumns: COL }}>
          <div className="flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase px-1 border-r border-border/30 py-1">
            All<br />day
          </div>
          {days.map((d) => {
            const dayEvs = allDay.filter((ev) => {
              const s = new Date(ev.start); s.setHours(0, 0, 0, 0)
              const e = new Date(ev.end ?? ev.start); e.setHours(23, 59, 59, 999)
              const m = new Date(d); m.setHours(12)
              return m >= s && m <= e
            })
            return (
              <div key={d.toISOString()} className="px-0.5 py-0.5 space-y-0.5 border-r border-border/20 last:border-r-0 min-h-[26px]">
                {dayEvs.map((ev) => <EventChip key={ev.id} event={ev} onClick={onEventClick} />)}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="relative" style={{ height: SLOT_HEIGHT * TOTAL_SLOTS }}>
          {/* Grid lines + time labels */}
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const h = START_HOUR + Math.floor(i / 2)
            const isHour = i % 2 === 0
            return (
              <div key={i} style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                className={`absolute inset-x-0 flex ${isHour ? 'border-t border-border/50' : 'border-t border-border/15'}`}>
                <span className="text-[10px] text-muted-foreground w-11 shrink-0 mt-0.5 ml-1 select-none font-medium">
                  {isHour ? `${String(h).padStart(2, '0')}:00` : ''}
                </span>
              </div>
            )
          })}

          {/* Vertical column dividers */}
          {days.map((_, colIdx) => (
            <div
              key={colIdx}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `calc(44px + ${colIdx} * ((100% - 44px) / 7))`,
                width: 1,
              }}
              className="bg-border/20"
            />
          ))}

          {/* Now line */}
          {nowOffset !== null && todayColIdx >= 0 && (
            <div
              style={{
                top: nowOffset, position: 'absolute',
                left: `calc(44px + ${todayColIdx} * ((100% - 44px) / 7))`,
                width: `calc((100% - 44px) / 7)`,
                zIndex: 10,
              }}
              className="flex items-center pointer-events-none"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
              <div className="flex-1 h-px bg-red-500/80" />
            </div>
          )}

          {/* Events */}
          {days.map((d, colIdx) =>
            timed
              .filter((ev) => new Date(ev.start).toDateString() === d.toDateString())
              .map((ev) => {
                const { top, height } = positionStyle(ev)
                return (
                  <div key={ev.id} style={{
                    top, height, position: 'absolute',
                    left: `calc(44px + ${colIdx} * ((100% - 44px) / 7) + 1px)`,
                    width: `calc((100% - 44px) / 7 - 3px)`,
                  }} className="py-0.5 px-0.5">
                    <EventChip event={ev} onClick={onEventClick} />
                  </div>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}
