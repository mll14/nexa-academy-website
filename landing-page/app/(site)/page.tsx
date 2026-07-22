export const runtime = 'edge'

import type { Metadata } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { homePageQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { buildMetadata, serializeJsonLd } from '@/lib/seo'
import type { HomePage, SiteSettings } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    sanityFetch<HomePage>({ query: homePageQuery, tags: ['homePage'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  return buildMetadata(page?.seo, {}, settings?.siteName, settings?.defaultSeo?.ogImage, '/')
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Nexa Academy',
  url: SITE_URL,
  logo: `${SITE_URL}/nexa-academy-small-logo.png`,
  description: "Kenya's leading coding bootcamp. Practical tech training in Nairobi.",
  address: {
    '@type': 'PostalAddress',
    streetAddress: '10th Floor, JKUAT Towers',
    addressLocality: 'Nairobi',
    addressCountry: 'KE',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'admissions',
    email: 'admissions@nexaacademy.co.ke',
    url: `${SITE_URL}/contact`,
  },
  sameAs: [],
}

export default async function HomePage() {
  const page = await sanityFetch<HomePage>({ query: homePageQuery, tags: ['homePage'] })
  if (!page?.sections?.length) return null
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
      />
      <SectionRenderer sections={page.sections} />
    </>
  )
}
