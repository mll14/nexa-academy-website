'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BlogCard } from './BlogCard'
import type { BlogPostSummary } from '@/types'

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Tutorial', value: 'tutorial' },
  { label: 'Career', value: 'career' },
  { label: 'Tech', value: 'tech' },
  { label: 'Student Life', value: 'student-life' },
  { label: 'News', value: 'news' },
  { label: 'Course Content', value: 'course-content' },
]

export function BlogFilter({
  posts,
  emptyText,
}: {
  posts: BlogPostSummary[]
  emptyText?: string
}) {
  const [active, setActive] = useState('all')

  const filtered = active === 'all' ? posts : posts.filter((p) => p.category === active)

  const available = new Set(['all', ...posts.map((p) => p.category)])

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.filter((c) => available.has(c.value)).map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActive(cat.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              active === cat.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {emptyText ?? 'No posts in this category yet.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <BlogCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
