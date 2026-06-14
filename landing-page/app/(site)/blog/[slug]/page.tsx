export const dynamic = 'force-static'
export const revalidate = false

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { sanityFetch } from '@/lib/sanity/client'
import { blogPostBySlugQuery, allBlogSlugsQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import type { BlogPost, SiteSettings } from '@/types'
import { urlFor } from '@/lib/sanity/image'
import { buildMetadata } from '@/lib/seo'
import { BlogBody } from '@/components/blog/BlogBody'
import { TableOfContents, type TocHeading } from '@/components/blog/TableOfContents'
import { BlogCard } from '@/components/blog/BlogCard'

interface Props { params: Promise<{ slug: string }> }

const CATEGORY_LABELS: Record<string, string> = {
  tutorial: 'Tutorial', career: 'Career Advice', tech: 'Tech & Industry',
  'student-life': 'Student Life', news: 'News', 'course-content': 'Course Content',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function extractToc(body: BlogPost['body']): TocHeading[] {
  if (!body) return []
  return body
    .filter((b): b is any => b._type === 'block' && ['h2', 'h3'].includes((b as any).style))
    .map((b: any) => {
      const text = (b.children ?? []).map((c: any) => c.text ?? '').join('')
      return {
        id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        text,
        level: (b.style === 'h2' ? 2 : 3) as 2 | 3,
      }
    })
}

export async function generateStaticParams() {
  const slugs = await sanityFetch<{ slug: string }[]>({ query: allBlogSlugsQuery, revalidate: false })
  return (slugs ?? []).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [post, settings] = await Promise.all([
    sanityFetch<BlogPost>({ query: blogPostBySlugQuery, params: { slug }, tags: [`blog-${slug}`] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  if (!post) return {}
  return buildMetadata(
    post.seo,
    { title: post.title, description: post.excerpt },
    settings?.siteName,
    settings?.defaultSeo?.ogImage,
  )
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await sanityFetch<BlogPost>({
    query: blogPostBySlugQuery,
    params: { slug },
    tags: [`blog-${slug}`],
    revalidate: 300,
  })

  if (!post) notFound()

  const toc = extractToc(post.body)
  const hasToc = toc.length >= 3

  return (
    <main className="min-h-screen bg-background">

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-primary font-medium">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
        </nav>
      </div>

      {/* Article header */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-10">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          {post.readingTime && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground">{post.readingTime} min read</span>
            </>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-5">
          {post.title}
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-7 max-w-2xl">
          {post.excerpt}
        </p>

        {/* Author line */}
        {post.author && (
          <div className="flex items-center gap-3">
            {post.author.photo?.asset && (
              <Image
                src={urlFor(post.author.photo).width(40).height(40).url()}
                alt={post.author.name}
                width={40}
                height={40}
                className="rounded-full object-cover ring-2 ring-border"
              />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{post.author.name}</p>
              {post.author.role && <p className="text-xs text-muted-foreground">{post.author.role}</p>}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-6">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Cover image */}
      {post.coverImage?.asset && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-border aspect-[2/1] bg-muted">
            <Image
              src={urlFor(post.coverImage).width(1200).height(600).url()}
              alt={post.coverImage.alt ?? post.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Body + TOC layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className={hasToc ? 'lg:grid lg:grid-cols-[1fr_220px] lg:gap-12' : ''}>

          {/* Article body */}
          <article className="max-w-2xl">
            {post.body && <BlogBody value={post.body} />}

            {/* Author bio */}
            {post.author?.bio && (
              <div className="mt-14 pt-8 border-t border-border">
                <div className="flex items-start gap-4">
                  {post.author.photo?.asset && (
                    <Image
                      src={urlFor(post.author.photo).width(64).height(64).url()}
                      alt={post.author.name}
                      width={64}
                      height={64}
                      className="rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      About the author
                    </p>
                    <p className="font-semibold text-foreground">{post.author.name}</p>
                    {post.author.role && (
                      <p className="text-sm text-muted-foreground mb-2">{post.author.role}</p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">{post.author.bio}</p>
                    <div className="flex gap-3 mt-3">
                      {post.author.linkedinUrl && (
                        <a href={post.author.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:opacity-75 transition-opacity">
                          LinkedIn →
                        </a>
                      )}
                      {post.author.twitterUrl && (
                        <a href={post.author.twitterUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:opacity-75 transition-opacity">
                          Twitter →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>

          {/* TOC sidebar (desktop only) */}
          {hasToc && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents headings={toc} />
              </div>
            </aside>
          )}
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Blog
          </Link>
        </div>

        {/* Related posts */}
        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              Related Articles
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {post.relatedPosts.map((rp) => (
                <BlogCard key={rp._id} post={rp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
