import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, Video } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { AvailableSlot } from '../types'

export type InterviewType = 'online' | 'physical'

interface Props {
  slots: AvailableSlot[]
  onConfirm: (time: string, interviewType: InterviewType) => void
  submitting?: boolean
  confirmLabel?: string
  defaultInterviewType?: InterviewType
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateKey(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
}

function formatDayFull(dateKey: string) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const raw = new Date(year, month, 1).getDay()
  return (raw + 6) % 7 // Mon = 0
}

// ── calendar ──────────────────────────────────────────────────────────────────

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Calendar({
  viewYear,
  viewMonth,
  availableDateSet,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
}: {
  viewYear: number
  viewMonth: number
  availableDateSet: Set<string>
  selectedDate: string | null
  onSelectDate: (key: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  const today = new Date().toLocaleDateString('en-CA')
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const startOffset = getFirstDayOfWeek(viewYear, viewMonth)

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="select-none w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrev}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-heading font-bold text-base">
          {formatMonthYear(new Date(viewYear, viewMonth))}
        </span>
        <button
          onClick={onNext}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasSlots = availableDateSet.has(key)
          const isSelected = selectedDate === key
          const isToday = today === key
          const isPast = key < today

          return (
            <button
              key={key}
              disabled={!hasSlots || isPast}
              onClick={() => onSelectDate(key)}
              className={cn(
                'relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-medium transition-all',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : hasSlots && !isPast
                  ? 'hover:bg-primary/10 text-foreground cursor-pointer'
                  : 'text-muted-foreground/30 cursor-default',
                isToday && !isSelected
                  ? 'ring-2 ring-primary/40 font-bold'
                  : '',
              )}
            >
              {day}
              {hasSlots && !isPast && !isSelected && (
                <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function SlotPicker({
  slots,
  onConfirm,
  submitting,
  confirmLabel = 'Confirm Interview',
  defaultInterviewType,
}: Props) {
  const available = slots.filter((s) => s.status === 'available')

  const slotsByDate: Record<string, AvailableSlot[]> = {}
  for (const s of available) {
    const k = toDateKey(s.time)
    if (!slotsByDate[k]) slotsByDate[k] = []
    slotsByDate[k].push(s)
  }

  const availableDates = Object.keys(slotsByDate).sort()
  const availableDateSet = new Set(availableDates)

  const firstDate = availableDates[0]
    ? new Date(availableDates[0] + 'T12:00:00')
    : new Date()

  const [viewYear, setViewYear] = useState(firstDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(availableDates[0] ?? null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [interviewType, setInterviewType] = useState<InterviewType | null>(defaultInterviewType ?? null)

  const handlePrev = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const handleNext = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const handleSelectDate = (key: string) => {
    setSelectedDate(key)
    setSelectedTime(null)
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No available slots. Please check back later or contact admissions.
      </p>
    )
  }

  const timesForDay = selectedDate ? (slotsByDate[selectedDate] ?? []) : []

  return (
    <div className="space-y-5">
      {/* Full-width calendar */}
      <Calendar
        viewYear={viewYear}
        viewMonth={viewMonth}
        availableDateSet={availableDateSet}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border-2 border-primary/50" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-primary font-semibold">Selected</span>
        </span>
      </div>

      {/* Time slots for selected date */}
      {selectedDate && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold">{formatDayFull(selectedDate)}</p>
          </div>
          {timesForDay.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timesForDay.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all',
                    selectedTime === slot.time
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[0.97]'
                      : 'border-border bg-card hover:bg-primary/5 hover:border-primary/40 text-foreground',
                  )}
                >
                  {formatTime(slot.time)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No available times on this day.</p>
          )}
        </div>
      )}

      {/* Confirm */}
      {selectedTime && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Interview type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'online', label: 'Online', icon: Video },
                { value: 'physical', label: 'Physical', icon: MapPin },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterviewType(value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                    interviewType === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground">Selected slot</p>
            <p className="text-sm font-bold mt-0.5">
              {formatDayFull(toDateKey(selectedTime))} · {formatTime(selectedTime)} EAT
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {interviewType ? `${interviewType === 'online' ? 'Online' : 'Physical'} interview` : 'Select online or physical interview'}
            </p>
          </div>
          <Button onClick={() => interviewType && onConfirm(selectedTime, interviewType)} disabled={submitting || !interviewType} className="w-full h-11 text-base">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Confirming…
              </span>
            ) : confirmLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export function formatFullDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
