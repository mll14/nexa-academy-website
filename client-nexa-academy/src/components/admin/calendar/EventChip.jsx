const TYPE_STYLES = {
  interview: 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200',
  intake:    'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200',
  external:  'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200',
};

export function EventChip({ event, onClick }) {
  const timeStr = event.all_day
    ? ''
    : new Date(event.start).toLocaleTimeString('en-KE', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      });

  return (
    <button
      onClick={(e) => onClick(event, e)}
      className={`w-full text-left text-xs rounded px-1.5 py-0.5 truncate transition-colors ${TYPE_STYLES[event.type] ?? TYPE_STYLES.external}`}
      title={event.title}
    >
      {timeStr && <span className="font-semibold mr-1">{timeStr}</span>}
      {event.title}
    </button>
  );
}
