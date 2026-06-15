export const runtime = 'edge'

import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { pageBySlugQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { buildMetadata } from '@/lib/seo'
import type { Page, SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return buildMetadata(
    null,
    { title: 'Legal', description: 'Terms of Service and Privacy Policy for Nexa Academy.' },
    s?.siteName,
    s?.defaultSeo?.ogImage,
  )
}

export default async function LegalPage() {
  const page = await sanityFetch<Page | null>({
    query: pageBySlugQuery,
    params: { slug: 'legal' },
    tags: ['page-legal'],
  })

  if (!page?.sections?.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h1 className="font-semibold tracking-tight">Legal</h1>
        <p className="text-muted-foreground">
          Our Terms of Service and Privacy Policy are being updated. Please check back soon or contact us at{' '}
          <a href="mailto:info@nexaacademy.co.ke" className="text-primary underline">
            info@nexaacademy.co.ke
          </a>
          .
        </p>
      </div>
    )
  }

  return <SectionRenderer sections={page.sections} />
}
