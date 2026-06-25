export const runtime = 'edge'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { sanityFetch } from '@/lib/sanity/client'
import { blogPostBySlugQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { buildMetadata, serializeJsonLd } from '@/lib/seo'
import { urlFor } from '@/lib/sanity/image'
import { BlogBody } from '@/components/blog/BlogBody'
import { BlogCard } from '@/components/blog/BlogCard'
import type { BlogPost, SiteSettings } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  tutorial: 'Tutorial',
  career: 'Career',
  tech: 'Tech',
  'student-life': 'Student Life',
  news: 'News',
  'course-content': 'Course Content',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [post, settings] = await Promise.all([
    sanityFetch<BlogPost>({ query: blogPostBySlugQuery, params: { slug }, tags: ['blogPost'] }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  if (!post) return { title: 'Post Not Found' }
  return buildMetadata(
    post.seo ?? null,
    { title: post.title, description: post.excerpt },
    settings?.siteName,
    settings?.defaultSeo?.ogImage,
    `/blog/${slug}`,
  )
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await sanityFetch<BlogPost>({
    query: blogPostBySlugQuery,
    params: { slug },
    tags: ['blogPost'],
    revalidate: 300,
  })

  if (!post) notFound()

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    url: `${SITE_URL}/blog/${slug}`,
    image: post.coverImage?.asset
      ? urlFor(post.coverImage).width(1200).height(630).url()
      : undefined,
    author: post.author?.name
      ? { '@type': 'Person', name: post.author.name }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Nexa Academy',
      url: SITE_URL,
    },
  }

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

        {/* Back */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
            {post.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            {post.title}
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>

          <div className="flex items-center gap-3 pt-1">
            {post.author?.photo?.asset && (
              <Image
                src={urlFor(post.author.photo).width(40).height(40).url()}
                alt={post.author.name}
                width={40}
                height={40}
                className="rounded-full border border-border shrink-0"
              />
            )}
            <div>
              {post.author?.name && (
                <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDate(post.publishedAt)}
                {post.readingTime ? ` · ${post.readingTime} min read` : ''}
              </p>
            </div>
          </div>
        </header>

        {/* Cover image */}
        {post.coverImage?.asset && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border mb-12">
            <Image
              src={urlFor(post.coverImage).width(1200).height(675).url()}
              alt={post.coverImage.alt ?? post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Body */}
        {post.body && <BlogBody value={post.body} className="mb-16" />}

        {/* Author bio */}
        {post.author?.bio && (
          <div className="border-t border-border pt-10 mb-16">
            <div className="flex items-start gap-4">
              {post.author.photo?.asset && (
                <Image
                  src={urlFor(post.author.photo).width(56).height(56).url()}
                  alt={post.author.name}
                  width={56}
                  height={56}
                  className="rounded-full border border-border shrink-0"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
                {post.author.role && (
                  <p className="text-xs text-primary mb-2">{post.author.role}</p>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{post.author.bio}</p>
                <div className="flex items-center gap-3 mt-3">
                  {post.author.linkedinUrl && (
                    <a
                      href={post.author.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                  )}
                  {post.author.twitterUrl && (
                    <a
                      href={post.author.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Twitter / X
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related posts */}
        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <div className="border-t border-border pt-10">
            <h2 className="text-lg font-bold text-foreground mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {post.relatedPosts.map((p) => (
                <BlogCard key={p._id} post={p} />
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
