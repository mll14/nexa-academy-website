import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity/image'
import { cn } from '@/lib/utils'
import type { BlogPostSummary } from '@/types'

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
    month: 'short',
    year: 'numeric',
  })
}

interface BlogCardProps {
  post: BlogPostSummary
  featured?: boolean
}

export function BlogCard({ post, featured }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-card overflow-hidden',
        'hover:border-primary/30 hover:shadow-md transition-all duration-200',
        featured && 'md:flex-row',
      )}
    >
      {/* Cover */}
      {post.coverImage?.asset && (
        <div className={cn(
          'relative overflow-hidden bg-muted flex-shrink-0',
          featured ? 'md:w-1/2 aspect-video md:aspect-auto md:min-h-[280px]' : 'aspect-[16/9]',
        )}>
          <Image
            src={urlFor(post.coverImage).width(featured ? 760 : 600).height(featured ? 400 : 338).url()}
            alt={post.coverImage.alt ?? post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className={cn('flex flex-col flex-1 p-5', featured && 'md:p-8 md:justify-center')}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[11px] text-muted-foreground">
            {post.readingTime ? `${post.readingTime} min read` : formatDate(post.publishedAt)}
          </span>
        </div>

        <h3 className={cn(
          'font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors',
          featured ? 'text-2xl md:text-3xl' : 'text-base',
        )}>
          {post.title}
        </h3>

        <p className={cn(
          'text-muted-foreground leading-relaxed line-clamp-2',
          featured ? 'text-base' : 'text-sm',
        )}>
          {post.excerpt}
        </p>

        {featured && (
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Read article
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
    </Link>
  )
}
