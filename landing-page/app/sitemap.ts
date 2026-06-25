import type { MetadataRoute } from 'next'
import { sanityFetch } from '@/lib/sanity/client'
import { allBlogSlugsQuery } from '@/lib/sanity/queries'
import { getAllSanityPrograms } from '@/lib/sanity/programs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, priority: 1.0, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/programs`, priority: 0.9, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/apply`, priority: 0.9, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/blog`, priority: 0.8, changeFrequency: 'daily' },
  { url: `${SITE_URL}/faq`, priority: 0.7, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/contact`, priority: 0.7, changeFrequency: 'yearly' },
  { url: `${SITE_URL}/appointments`, priority: 0.6, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/legal`, priority: 0.3, changeFrequency: 'yearly' },
]

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, blogSlugs] = await Promise.all([
    getAllSanityPrograms(),
    sanityFetch<{ slug: string }[]>({
      query: allBlogSlugsQuery,
      tags: ['blogPost'],
      revalidate: 3600,
    }),
  ])

  const programRoutes: MetadataRoute.Sitemap = programs.map((p) => ({
    url: `${SITE_URL}/programs/${p.slug}`,
    priority: 0.85,
    changeFrequency: 'weekly',
  }))

  const blogRoutes: MetadataRoute.Sitemap = (blogSlugs ?? []).map((b) => ({
    url: `${SITE_URL}/blog/${b.slug}`,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  return [...STATIC_ROUTES, ...programRoutes, ...blogRoutes]
}
