export const runtime = 'edge'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { buildMetadata } from '@/lib/seo'
import { defineQuery } from 'groq'
import { AppointmentBookingClient } from './AppointmentBookingClient'

interface Cta { label?: string; url?: string }
interface Feature { title: string; description: string }
interface Benefit { icon?: string; title: string; description: string }

export interface AppointmentsPageData {
  badge?: string
  headline?: string
  subheadline?: string
  heroCtaPrimary?: Cta
  heroCtaSecondary?: Cta
  benefitsBadge?: string
  benefitsHeadline?: string
  benefitsSubheadline?: string
  benefits?: Benefit[]
  ctaHeadline?: string
  ctaSubheadline?: string
  ctaButtonLabel?: string
  formBadge?: string
  formHeadline?: string
  formSubheadline?: string
  features?: Feature[]
  nextSteps?: string[]
  officeAddress?: string
  officeMapUrl?: string
  seo?: unknown
}

const appointmentsPageQuery = defineQuery(`
  *[_type == "appointmentsPage"][0]{
    badge, headline, subheadline,
    heroCtaPrimary{ label, url },
    heroCtaSecondary{ label, url },
    benefitsBadge, benefitsHeadline, benefitsSubheadline,
    benefits[]{ icon, title, description },
    ctaHeadline, ctaSubheadline, ctaButtonLabel,
    formBadge, formHeadline, formSubheadline,
    features[]{ title, description },
    nextSteps,
    officeAddress, officeMapUrl,
    seo{ title, description, ogImage{ asset->{ url } } }
  }
`)

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(
    null,
    { title: 'Book an Appointment', description: 'Book a physical or virtual appointment with the Nexa Academy admissions team or a technical mentor.' },
    'Nexa Academy',
  )
}

export default async function AppointmentsPage() {
  const data = await sanityFetch<AppointmentsPageData>({
    query: appointmentsPageQuery,
    tags: ['appointmentsPage'],
  })

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground gap-2">
        <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Loading…
      </div>
    }>
      <AppointmentBookingClient data={data ?? {}} />
    </Suspense>
  )
}
