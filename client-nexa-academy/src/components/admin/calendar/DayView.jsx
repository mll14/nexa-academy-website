import { EventChip } from './EventChip';

const SLOT_HEIGHT = 48;
const START_HOUR = 9;
const END_HOUR = 18;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

function positionStyle(event) {
  const start = new Date(event.start);
  const offsetMin = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + 30 * 60000);
  const durationMin = (end - start) / 60000;
  return {
    top: (offsetMin / 30) * SLOT_HEIGHT,
    height: Math.max((durationMin / 30) * SLOT_HEIGHT, SLOT_HEIGHT / 2),
  };
}

export function DayView({ date, events, onEventClick }) {
  const allDay = events.filter((e) => e.all_day);
  const timed = events.filter((e) => !e.all_day);
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const h = START_HOUR + Math.floor(i / 2);
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
  });

  return (
    <div className="overflow-auto">
      {allDay.length > 0 && (
        <div className="border-b border-border px-2 py-1 space-y-0.5 bg-muted/20">
          {allDay.map((ev) => (
            <EventChip key={ev.id} event={ev} onClick={onEventClick} />
          ))}
        </div>
      )}
      <div className="relative" style={{ height: SLOT_HEIGHT * TOTAL_SLOTS }}>
        {slots.map((label, i) => (
          <div
            key={label}
            style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            className="absolute inset-x-0 border-t border-border/40 flex items-start"
          >
            <span className="text-[10px] text-muted-foreground w-10 shrink-0 mt-0.5 ml-1 select-none">
              {label}
            </span>
          </div>
        ))}
        {timed.map((ev) => {
          const { top, height } = positionStyle(ev);
          return (
            <div
              key={ev.id}
              style={{ top, height, left: 44, right: 4, position: 'absolute' }}
              className="pr-0.5"
            >
              <EventChip event={ev} onClick={onEventClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
