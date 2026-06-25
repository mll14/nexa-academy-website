export const runtime = 'edge'

import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { buildMetadata } from '@/lib/seo'
import { appointmentsPageQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import type { SEO, Section } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<{ seo?: SEO }>({
    query: appointmentsPageQuery,
    tags: ['appointmentsPage'],
  })
  return buildMetadata(
    page?.seo,
    { title: 'Book an Appointment', description: 'Book a physical or virtual appointment with the Nexa Academy admissions team or a technical mentor.' },
    'Nexa Academy',
  )
}

export default async function AppointmentsPage() {
  const page = await sanityFetch<{ seo?: SEO; sections?: Section[] }>({
    query: appointmentsPageQuery,
    tags: ['appointmentsPage'],
  })

  if (!page?.sections?.length) return null

  return <SectionRenderer sections={page.sections} />
}
