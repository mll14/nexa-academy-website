export const runtime = 'edge'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, MapPin, ArrowLeft } from 'lucide-react'
import { sanityFetch } from '@/lib/sanity/client'
import { eventBySlugQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { buildMetadata, serializeJsonLd } from '@/lib/seo'
import { SanityImage } from '@/components/shared/SanityImage'
import { PortableTextRenderer } from '@/components/shared/PortableTextRenderer'
import { formatEventDate } from '@/components/events/EventCard'
import type { EventDoc, SiteSettings } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [event, settings] = await Promise.all([
    sanityFetch<EventDoc | null>({ query: eventBySlugQuery, params: { slug }, tags: ['event'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  if (!event) return { title: 'Event Not Found' }
  return buildMetadata(
    event.seo ?? null,
    {
      title: event.title,
      description: `${event.title} — ${formatEventDate(event.startDate)}${event.location ? ` at ${event.location}` : ''}.`,
    },
    settings?.siteName,
    settings?.defaultSeo?.ogImage,
    `/events/${slug}`,
  )
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await sanityFetch<EventDoc | null>({
    query: eventBySlugQuery,
    params: { slug },
    tags: ['event'],
    revalidate: 300,
  })

  if (!event) notFound()

  const isPast =
    event.status === 'past' ||
    new Date(event.endDate ?? event.startDate).getTime() < Date.now()

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    ...(event.location ? { location: { '@type': 'Place', name: event.location } } : {}),
    url: `${SITE_URL}/events/${slug}`,
    organizer: { '@type': 'Organization', name: 'Nexa Academy', url: SITE_URL },
  }

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventSchema) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> All events
        </Link>

        {event.coverImage?.asset && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-muted">
            <SanityImage
              image={event.coverImage}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="space-y-4">
          {isPast && (
            <span className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
              Past event
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              {formatEventDate(event.startDate)}
              {event.endDate && ` – ${formatEventDate(event.endDate)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {event.description && (
          <div className="mt-8">
            <PortableTextRenderer value={event.description} />
          </div>
        )}

        {!isPast && (
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            {event.registrationUrl && (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                Register
              </a>
            )}
            <Link
              href="/appointments"
              className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg border border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
            >
              Book a visit instead
            </Link>
          </div>
        )}
      </article>
    </main>
  )
}
