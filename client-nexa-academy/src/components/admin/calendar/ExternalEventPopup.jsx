import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';

function fmtDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function ExternalEventPopup({ event, anchorRect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!event) return null;

  const top = anchorRect ? anchorRect.bottom + 6 : 200;
  const left = anchorRect
    ? Math.min(anchorRect.left, window.innerWidth - 288)
    : 200;

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 50 }}
      className="w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{event.title}</p>
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-700 mt-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {event.all_day
          ? `All day · ${new Date(event.start).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : `${fmtDT(event.start)} – ${fmtDT(event.end)} EAT`}
      </p>
      {event.meta?.description && (
        <p className="text-xs text-gray-600 line-clamp-3">{event.meta.description}</p>
      )}
      {/^https:\/\//i.test(event.meta?.gcal_link) && (
        <a
          href={event.meta.gcal_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Open in Google Calendar
        </a>
      )}
    </div>
  );
}
