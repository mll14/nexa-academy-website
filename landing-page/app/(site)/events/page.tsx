export const runtime = 'edge'

import type { Metadata } from 'next'
import Link from 'next/link'
import { sanityFetch } from '@/lib/sanity/client'
import { allEventsQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { EventCard } from '@/components/events/EventCard'
import type { EventSummary, SiteSettings } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return {
    title: 'Events & Open Days',
    description: `Workshops, open days, demo nights, and meetups from ${settings?.siteName ?? 'Nexa Academy'} in Nairobi.`,
    alternates: { canonical: `${SITE_URL}/events` },
  }
}

/**
 * An event counts as upcoming until its end time (or its start time, when no
 * end is set) has passed — so an event running today doesn't drop into "past".
 */
function isUpcoming(event: EventSummary, now: number): boolean {
  if (event.status === 'past') return false
  const ends = new Date(event.endDate ?? event.startDate).getTime()
  return Number.isNaN(ends) ? true : ends >= now
}

export default async function EventsPage() {
  const events = await sanityFetch<EventSummary[]>({
    query: allEventsQuery,
    tags: ['event'],
    revalidate: 300,
  })

  const now = Date.now()
  const all = events ?? []
  const upcoming = all
    .filter((e) => isUpcoming(e, now))
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
  const past = all.filter((e) => !isUpcoming(e, now))

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Events</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Open days, workshops & demo nights
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Come meet the team, see student projects, and get a feel for how we teach — in person
            at our Nairobi campus or online.
          </p>
        </div>

        {upcoming.length > 0 && (
          <section className="mb-16">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              Upcoming
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              Past events
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard key={event._id} event={event} past />
              ))}
            </div>
          </section>
        )}

        {all.length === 0 && (
          <div className="py-24 text-center space-y-4">
            <p className="text-muted-foreground text-lg">
              No events scheduled right now. Check back soon — or book a visit and we&apos;ll show
              you around.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/appointments"
                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                Book a visit
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border font-semibold hover:bg-muted transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
