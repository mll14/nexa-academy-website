import type { Metadata } from 'next'
import Link from 'next/link'
import { sanityFetch } from '@/lib/sanity/client'
import { allBlogPostsQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import type { BlogPostSummary, SiteSettings } from '@/types'
import { BlogCard } from '@/components/blog/BlogCard'
import { BlogFilter } from '@/components/blog/BlogFilter'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return {
    title: 'Blog',
    description: `Tutorials, career advice, and stories from ${settings?.siteName ?? 'Nexa Academy'}.`,
  }
}

export default async function BlogPage() {
  const posts = await sanityFetch<BlogPostSummary[]>({
    query: allBlogPostsQuery,
    tags: ['blogPost'],
    revalidate: 300,
  })

  const all = posts ?? []
  const featured = all.find((p) => p.featured) ?? all[0]
  const rest = all.filter((p) => p._id !== featured?._id)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

        {/* Page header */}
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Blog</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Insights & Tutorials
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Deep dives, career guides, and stories from our instructors and students.
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
                {featured ? 'More Articles' : 'All Articles'}
              </h2>
            </div>
            <BlogFilter posts={rest} />
          </>
        )}

        {all.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-muted-foreground text-lg">No posts published yet. Check back soon!</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:opacity-75 transition-opacity"
            >
              ← Back to home
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
