export const runtime = 'edge'

import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { allFaqsQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { FAQPageClient } from './FAQPageClient'
import { buildMetadata } from '@/lib/seo'
import type { FaqDoc, SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return buildMetadata(
    null,
    { title: 'FAQ', description: 'Find answers to common questions about our programs, admissions, pricing, and learning model.' },
    s?.siteName,
    s?.defaultSeo?.ogImage,
  )
}

export default async function FAQPage() {
  const faqs = await sanityFetch<FaqDoc[]>({ query: allFaqsQuery, tags: ['faq'] })
  return <FAQPageClient faqs={faqs ?? []} />
}
