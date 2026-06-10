import { useState } from 'react';
import { EventChip } from './EventChip';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE = 3;

function getMonthGrid(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startPad = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startPad);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function eventsOnDay(events, d) {
  return events.filter((ev) => {
    if (ev.all_day) {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end || ev.start);
      evStart.setHours(0, 0, 0, 0);
      evEnd.setHours(23, 59, 59, 999);
      const dMid = new Date(d);
      dMid.setHours(12);
      return dMid >= evStart && dMid <= evEnd;
    }
    return new Date(ev.start).toDateString() === d.toDateString();
  });
}

export function MonthView({ cursor, events, onEventClick }) {
  const [expanded, setExpanded] = useState(null);
  const cells = getMonthGrid(cursor);
  const currentMonth = cursor.getMonth();
  const today = new Date().toDateString();

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center py-2 text-xs font-medium text-muted-foreground">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentMonth;
          const isToday = d.toDateString() === today;
          const dateKey = d.toDateString();
          const dayEvents = eventsOnDay(events, d);
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - MAX_VISIBLE;
          const isExpanded = expanded === dateKey;

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r border-border p-1 ${
                !isCurrentMonth ? 'bg-muted/20' : ''
              }`}
            >
              <div className="mb-0.5">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60'}`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {(isExpanded ? dayEvents : visible).map((ev) => (
                  <EventChip key={ev.id} event={ev} onClick={onEventClick} />
                ))}
                {!isExpanded && overflow > 0 && (
                  <button
                    onClick={() => setExpanded(dateKey)}
                    className="text-[10px] text-blue-600 hover:underline block"
                  >
                    +{overflow} more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setExpanded(null)}
                    className="text-[10px] text-muted-foreground hover:underline block"
                  >
                    show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
