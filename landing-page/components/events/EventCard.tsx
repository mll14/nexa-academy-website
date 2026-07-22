import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import { SanityImage } from '@/components/shared/SanityImage'
import type { EventSummary } from '@/types'

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Nairobi',
  })
}

export function EventCard({ event, past = false }: { event: EventSummary; past?: boolean }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group flex flex-col rounded-2xl border border-border overflow-hidden transition-colors hover:border-primary ${
        past ? 'opacity-75 hover:opacity-100' : ''
      }`}
    >
      <div className="relative aspect-[16/9] bg-muted">
        {event.coverImage?.asset ? (
          <SanityImage
            image={event.coverImage}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}
        {event.status === 'ongoing' && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider">
            Happening now
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">
          {formatEventDate(event.startDate)}
        </p>
        <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        {event.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {event.location}
          </p>
        )}
      </div>
    </Link>
  )
}
