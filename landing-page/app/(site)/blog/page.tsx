export const runtime = 'edge'

import type { Metadata } from 'next'
import Link from 'next/link'
import { sanityFetch } from '@/lib/sanity/client'
import { allBlogPostsQuery, blogIndexPageQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { buildMetadata } from '@/lib/seo'
import type { BlogIndexPage, BlogPostSummary, SiteSettings } from '@/types'
import { BlogCard } from '@/components/blog/BlogCard'
import { BlogFilter } from '@/components/blog/BlogFilter'

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    sanityFetch<BlogIndexPage>({ query: blogIndexPageQuery, tags: ['blogIndexPage'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  const siteName = settings?.siteName ?? 'Nexa Academy'
  return buildMetadata(
    page?.seo ?? null,
    {
      title: 'Tech Blog & Tutorials',
      description: `Coding tutorials, career advice, and student stories from ${siteName} — Kenya's leading tech bootcamp.`,
    },
    siteName,
    settings?.defaultSeo?.ogImage,
    '/blog',
  )
}

export default async function BlogPage() {
  const [posts, page] = await Promise.all([
    sanityFetch<BlogPostSummary[]>({
      query: allBlogPostsQuery,
      tags: ['blogPost'],
      revalidate: 300,
    }),
    sanityFetch<BlogIndexPage>({
      query: blogIndexPageQuery,
      tags: ['blogIndexPage'],
      revalidate: 300,
    }),
  ])

  const all = posts ?? []
  const showFeatured = page?.showFeatured ?? true
  const featured = showFeatured ? (all.find((p) => p.featured) ?? all[0]) : undefined
  const rest = featured ? all.filter((p) => p._id !== featured._id) : all
  const emptyCta = page?.emptyStateCta

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

        {/* Page header */}
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            {page?.eyebrow ?? 'Blog'}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
            {page?.headline ?? 'Insights & Tutorials'}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {page?.intro ?? 'Deep dives, career guides, and stories from our instructors and students.'}
          </p>
        </div>

        {/* Featured post */}
        {featured && (
          <div className="mb-14">
            <BlogCard post={featured} featured />
          </div>
        )}

        {/* Remaining posts with category filter */}
        {rest.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {featured
                  ? (page?.moreArticlesHeading ?? 'More Articles')
                  : (page?.allArticlesHeading ?? 'All Articles')}
              </h2>
            </div>
            <BlogFilter posts={rest} emptyText={page?.emptyCategoryText} />
          </>
        )}

        {all.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-muted-foreground text-lg">
              {page?.emptyStateText ?? 'No posts published yet. Check back soon!'}
            </p>
            <Link
              href={emptyCta?.url ?? '/'}
              {...(emptyCta?.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:opacity-75 transition-opacity"
            >
              {emptyCta?.label ?? '← Back to home'}
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
