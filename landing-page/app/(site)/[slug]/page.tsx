export const dynamic = 'force-static'
export const revalidate = false

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sanityFetch } from '@/lib/sanity/client'
import { pageBySlugQuery, allPageSlugsQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { buildMetadata } from '@/lib/seo'
import type { Page, SiteSettings } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await sanityFetch<{ slug: string }[]>({
    query: allPageSlugsQuery,
    revalidate: false,
  })
  return (slugs ?? []).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [page, settings] = await Promise.all([
    sanityFetch<Page>({ query: pageBySlugQuery, params: { slug }, tags: [`page-${slug}`] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  if (!page) return {}
  return buildMetadata(page.seo, { title: page.title }, settings?.siteName, settings?.defaultSeo?.ogImage)
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  const page = await sanityFetch<Page>({
    query: pageBySlugQuery,
    params: { slug },
    tags: [`page-${slug}`],
  })
  if (!page) notFound()
  return <SectionRenderer sections={page.sections ?? []} />
}
