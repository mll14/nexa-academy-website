'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

interface TableOfContentsProps {
  headings: TocHeading[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!headings.length) return
    const els = headings
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (!headings.length) return null

  return (
    <nav aria-label="Table of contents" className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        On this page
      </p>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={cn(
            'block text-sm leading-snug py-1 border-l-2 transition-all duration-150',
            h.level === 2 ? 'pl-3' : 'pl-5',
            active === h.id
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  )
}
