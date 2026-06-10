import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Time grid config ──────────────────────────────────────────────────────────

const TIME_LABELS = [];
for (let h = 10; h < 16; h++) {
  TIME_LABELS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_LABELS.push(`${String(h).padStart(2, "0")}:30`);
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function slotKey(date, timeLabel) {
  const [h, m] = timeLabel.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function isSameSlot(isoA, isoB) {
  return new Date(isoA).getTime() === new Date(isoB).getTime();
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

export function formatFullDateTime(isoString) {
  try {
    return new Date(isoString).toLocaleString("en-KE", {
      weekday: "long", day: "numeric", month: "long",
      year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

// ── Status styling ────────────────────────────────────────────────────────────

const SLOT_CONFIG = {
  available: {
    label: "Free",
    cell: "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer",
    legend: "bg-green-100",
    legendLabel: "Available",
    clickable: true,
  },
  busy: {
    label: "Busy",
    cell: "bg-red-100 text-red-700 cursor-not-allowed",
    legend: "bg-red-100",
    legendLabel: "Busy",
    clickable: false,
  },
  holiday: {
    label: "Holiday",
    cell: "bg-orange-100 text-orange-700 cursor-not-allowed",
    legend: "bg-orange-100",
    legendLabel: "Public Holiday",
    clickable: false,
  },
  blackout: {
    label: "Blocked",
    cell: "bg-gray-200 text-gray-500 line-through cursor-not-allowed",
    legend: "bg-gray-200",
    legendLabel: "Admin Blocked",
    clickable: false,
  },
};

// ── SlotPicker ────────────────────────────────────────────────────────────────

/**
 * slots      — [{time: ISO string, status: "available"|"busy"|"holiday"|"blackout"}]
 * onConfirm  — (isoString) => void
 * submitting — bool
 * confirmLabel — string (default "Confirm Interview Time")
 */
export function SlotPicker({ slots = [], onConfirm, submitting, confirmLabel = "Confirm Interview Time" }) {
  const today = new Date();
  const [monday, setMonday] = useState(() => getMondayOf(today));
  const [selected, setSelected] = useState(null);

  const days = getWeekDays(monday);

  const slotMap = new Map(
    slots.map((s) => [new Date(s.time).getTime(), s.status])
  );

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    if (d >= getMondayOf(today)) setMonday(d);
  };
  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    setMonday(d);
  };

  const weekLabel = `${days[0].toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${days[4].toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;

  const weekStatuses = new Set();
  for (const d of days) {
    for (const label of TIME_LABELS) {
      const ts = new Date(slotKey(d, label)).getTime();
      const status = slotMap.get(ts);
      if (status) weekStatuses.add(status);
    }
  }

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", fontSize: "11px" }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="text-center py-1 font-semibold text-muted-foreground">
              {formatShortDate(d)}
            </div>
          ))}
          {TIME_LABELS.map((label) => (
            <>
              <div key={`label-${label}`} className="py-1 pr-2 text-right text-muted-foreground leading-7">
                {label}
              </div>
              {days.map((d) => {
                const iso = slotKey(d, label);
                const ts = new Date(iso).getTime();
                const status = slotMap.get(ts);
                const isSel = selected && isSameSlot(selected, iso);
                const cfg = status ? SLOT_CONFIG[status] : null;

                return (
                  <div key={iso} className="p-0.5">
                    {isSel ? (
                      <button
                        onClick={() => setSelected(null)}
                        className="w-full rounded-md py-1 text-xs font-medium bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                      >
                        ✓
                      </button>
                    ) : cfg ? (
                      <button
                        onClick={() => cfg.clickable && setSelected(iso)}
                        disabled={!cfg.clickable}
                        title={cfg.clickable ? `Select ${label}` : cfg.legendLabel}
                        className={cn(
                          "w-full rounded-md py-1 text-xs font-medium transition-colors text-center",
                          cfg.cell
                        )}
                      >
                        {cfg.label}
                      </button>
                    ) : (
                      <div className="w-full rounded-md py-1 text-xs text-center text-muted-foreground/30">
                        ·
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {["available", "busy", "holiday", "blackout"]
          .filter((s) => weekStatuses.has(s))
          .map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${SLOT_CONFIG[s].legend}`} />
              {SLOT_CONFIG[s].legendLabel}
            </span>
          ))}
        {selected && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-primary" /> Selected
          </span>
        )}
      </div>

      {/* Confirm */}
      {selected && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-sm font-medium">Selected: {formatFullDateTime(selected)} EAT</p>
          <Button className="w-full" disabled={submitting} onClick={() => onConfirm(selected)}>
            {submitting ? "Saving…" : confirmLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
