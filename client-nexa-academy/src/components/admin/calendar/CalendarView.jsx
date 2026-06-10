import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import calendarService from '@/services/calendarService';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { ExternalEventPopup } from './ExternalEventPopup';

function getViewRange(view, cursor) {
  if (view === 'today') {
    const start = new Date(cursor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(cursor);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (view === 'week') {
    const monday = new Date(cursor);
    monday.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
  // month — include padding days visible in grid
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startPad);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getHeaderLabel(view, cursor) {
  if (view === 'today') {
    return cursor.toLocaleDateString('en-KE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
  if (view === 'week') {
    const monday = new Date(cursor);
    monday.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const short = { day: 'numeric', month: 'short' };
    return `${monday.toLocaleDateString('en-KE', short)} – ${sunday.toLocaleDateString('en-KE', { ...short, year: 'numeric' })}`;
  }
  return cursor.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

function moveCursor(view, cursor, dir) {
  const next = new Date(cursor);
  if (view === 'today') next.setDate(next.getDate() + dir);
  else if (view === 'week') next.setDate(next.getDate() + dir * 7);
  else next.setMonth(next.getMonth() + dir);
  return next;
}

export function CalendarView({ onInterviewClick, onIntakeClick }) {
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [externalPopup, setExternalPopup] = useState(null);

  const load = useCallback(async () => {
    const { start, end } = getViewRange(view, cursor);
    setLoading(true);
    setError(null);
    const result = await calendarService.fetchEvents(start, end);
    setLoading(false);
    if (result.error) setError(result.error);
    else setEvents(result.events);
  }, [view, cursor]);

  useEffect(() => { load(); }, [load]);

  const handleEventClick = useCallback((event, nativeEvent) => {
    if (event.type === 'interview') {
      onInterviewClick(event.meta.application_id);
    } else if (event.type === 'intake') {
      onIntakeClick(event.meta.intake_id);
    } else {
      const rect = nativeEvent?.currentTarget?.getBoundingClientRect?.();
      setExternalPopup({ event, anchorRect: rect });
    }
  }, [onInterviewClick, onIntakeClick]);

  const handleRefresh = () => {
    calendarService.clearCache();
    load();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          onClick={() => setCursor(moveCursor(view, cursor, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold flex-1 text-center min-w-0 truncate">
          {getHeaderLabel(view, cursor)}
        </span>
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          onClick={() => setCursor(moveCursor(view, cursor, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="flex gap-1 ml-2">
          {['today', 'week', 'month'].map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? 'default' : 'outline'}
              className="h-7 capitalize text-xs px-3"
              onClick={() => {
                setView(v);
                if (v === 'today') setCursor(new Date());
              }}
            >
              {v}
            </Button>
          ))}
        </div>

        <Button
          size="sm" variant="ghost" className="h-7 text-xs"
          onClick={() => setCursor(new Date())}
          title="Jump to today"
        >
          Now
        </Button>

        <Button
          size="sm" variant="ghost" className="h-7 w-7 p-0"
          onClick={handleRefresh}
          title="Refresh calendar"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20 pointer-events-none">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="p-4 text-sm text-red-500">{error}</div>
        )}
        {view === 'today' && (
          <DayView date={cursor} events={events} onEventClick={handleEventClick} />
        )}
        {view === 'week' && (
          <WeekView cursor={cursor} events={events} onEventClick={handleEventClick} />
        )}
        {view === 'month' && (
          <MonthView cursor={cursor} events={events} onEventClick={handleEventClick} />
        )}
      </div>

      {externalPopup && (
        <ExternalEventPopup
          event={externalPopup.event}
          anchorRect={externalPopup.anchorRect}
          onClose={() => setExternalPopup(null)}
        />
      )}
    </div>
  );
}
