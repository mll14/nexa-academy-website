import { EventChip } from './EventChip'
import type { CalendarEvent } from '../../../lib/calendarService'

const SLOT_HEIGHT = 48
const START_HOUR = 9
const END_HOUR = 18
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2

function getWeekDays(cursor: Date): Date[] {
  const monday = new Date(cursor)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function positionStyle(event: CalendarEvent) {
  const start = new Date(event.start)
  const offsetMin = (start.getHours() - START_HOUR) * 60 + start.getMinutes()
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + 30 * 60000)
  const durationMin = (end.getTime() - start.getTime()) / 60000
  return {
    top: (offsetMin / 30) * SLOT_HEIGHT,
    height: Math.max((durationMin / 30) * SLOT_HEIGHT, SLOT_HEIGHT / 2),
  }
}

interface Props {
  cursor: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void
}

export function WeekView({ cursor, events, onEventClick }: Props) {
  const days = getWeekDays(cursor)
  const allDay = events.filter((e) => e.all_day)
  const timed = events.filter((e) => !e.all_day)
  const today = new Date().toDateString()

  return (
    <div className="overflow-auto">
      <div className="grid border-b border-border sticky top-0 bg-background z-10"
        style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
        <div />
        {days.map((d) => {
          const isToday = d.toDateString() === today
          return (
            <div key={d.toISOString()} className="text-center py-2">
              <div className={`text-[10px] font-medium uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {d.toLocaleDateString('en-KE', { weekday: 'short' })}
              </div>
              <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center mx-auto rounded-full
                ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {allDay.length > 0 && (
        <div className="grid border-b border-border bg-muted/20 min-h-8"
          style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
          <div />
          {days.map((d) => {
            const dayEvents = allDay.filter((ev) => {
              const evStart = new Date(ev.start)
              const evEnd = new Date(ev.end ?? ev.start)
              const dMid = new Date(d); dMid.setHours(12)
              return dMid >= evStart && dMid <= evEnd
            })
            return (
              <div key={d.toISOString()} className="px-0.5 py-0.5 space-y-0.5">
                {dayEvents.map((ev) => <EventChip key={ev.id} event={ev} onClick={onEventClick} />)}
              </div>
            )
          })}
        </div>
      )}

      <div className="relative" style={{ height: SLOT_HEIGHT * TOTAL_SLOTS }}>
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const h = START_HOUR + Math.floor(i / 2)
          const m = i % 2 === 0 ? '00' : '30'
          return (
            <div key={i} style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              className="absolute inset-x-0 border-t border-border/30 flex">
              <span className="text-[10px] text-muted-foreground w-10 shrink-0 mt-0.5 ml-1 select-none">
                {i % 2 === 0 ? `${String(h).padStart(2, '0')}:${m}` : ''}
              </span>
            </div>
          )
        })}
        {days.map((d, colIdx) =>
          timed
            .filter((ev) => new Date(ev.start).toDateString() === d.toDateString())
            .map((ev) => {
              const { top, height } = positionStyle(ev)
              return (
                <div key={ev.id} style={{
                  top, height, position: 'absolute',
                  left: `calc(40px + ${colIdx} * ((100% - 40px) / 7))`,
                  width: `calc((100% - 40px) / 7 - 4px)`,
                }} className="px-0.5">
                  <EventChip event={ev} onClick={onEventClick} />
                </div>
              )
            })
        )}
      </div>
    </div>
  )
}
