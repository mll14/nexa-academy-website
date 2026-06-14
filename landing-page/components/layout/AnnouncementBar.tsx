'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/types'

const styleClasses: Record<string, string> = {
  info:    'bg-blue-50   text-blue-700  border-blue-200',
  warning: 'bg-amber-50  text-amber-700 border-amber-200',
  success: 'bg-green-50  text-green-700 border-green-200',
  promo:   'bg-primary/10 text-primary  border-primary/20',
}

export function AnnouncementBar({ bar }: { bar: NonNullable<SiteSettings['announcementBar']> }) {
  const [dismissed, setDismissed] = useState(false)
  const storageKey = `announcement-dismissed:${bar.text}`

  useEffect(() => {
    if (localStorage.getItem(storageKey) === '1') setDismissed(true)
  }, [storageKey])

  if (!bar.isActive || !bar.text || dismissed) return null

  const dismiss = () => {
    localStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  const classes = cn(
    'relative w-full border-b py-2 px-4 text-center text-sm font-medium',
    styleClasses[bar.style ?? 'info'] ?? styleClasses.info,
  )

  return (
    <div className={classes}>
      <span className="block pr-8">
        {bar.link?.url ? (
          <Link
            href={bar.link.url}
            target={bar.link.openInNewTab ? '_blank' : undefined}
            className="hover:underline underline-offset-2"
          >
            {bar.text}
          </Link>
        ) : bar.text}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 opacity-60 hover:opacity-100 hover:bg-black/10 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
