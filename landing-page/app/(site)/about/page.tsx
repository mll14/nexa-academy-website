export const runtime = 'edge'

import type { Metadata } from 'next'
import Link from 'next/link'
import { sanityFetch } from '@/lib/sanity/client'
import { pageBySlugQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { buildMetadata } from '@/lib/seo'
import type { Page, SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    sanityFetch<Page | null>({ query: pageBySlugQuery, params: { slug: 'about' }, tags: ['page-about'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  return buildMetadata(
    page?.seo,
    {
      title: 'About Us',
      description:
        "Who we are, why we started, and how we train Kenya's next generation of software engineers.",
    },
    settings?.siteName,
    settings?.defaultSeo?.ogImage,
    '/about',
  )
}

export default async function AboutPage() {
  const page = await sanityFetch<Page | null>({
    query: pageBySlugQuery,
    params: { slug: 'about' },
    tags: ['page-about'],
  })

  if (page?.sections?.length) {
    return <SectionRenderer sections={page.sections} />
  }

  // No CMS content yet — a plain, honest placeholder beats an empty screen.
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 space-y-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest">About Us</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          Practical tech training, built for Kenya
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Our About page is being put together in the CMS. In the meantime, you can explore our
          programs or talk to the admissions team directly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/programs"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse programs
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-lg border border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            Talk to us
          </Link>
        </div>
        <p className="text-sm text-muted-foreground pt-4">
          Or email us at{' '}
          <a href="mailto:info@nexaacademy.co.ke" className="text-primary underline">
            info@nexaacademy.co.ke
          </a>
          .
        </p>
      </div>
    </main>
  )
}
