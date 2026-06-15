export const runtime = 'edge'

import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { homePageQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { buildMetadata } from '@/lib/seo'
import type { HomePage, SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    sanityFetch<HomePage>({ query: homePageQuery, tags: ['homePage'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  return buildMetadata(page?.seo, {}, settings?.siteName, settings?.defaultSeo?.ogImage)
}

export default async function HomePage() {
  const page = await sanityFetch<HomePage>({ query: homePageQuery, tags: ['homePage'] })
  if (!page?.sections?.length) return null
  return <SectionRenderer sections={page.sections} />
}
