'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/Button'
import type { Navigation } from '@/types'

interface MobileNavProps {
  navigation: Navigation | null
}

export function MobileNav({ navigation }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-foreground"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <div className={cn('h-0.5 w-6 bg-current transition-all', open && 'translate-y-1.5 rotate-45')} />
        <div className={cn('my-1.5 h-0.5 w-6 bg-current transition-all', open && 'opacity-0')} />
        <div className={cn('h-0.5 w-6 bg-current transition-all', open && '-translate-y-1.5 -rotate-45')} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full bg-background border-b border-border shadow-lg z-50">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            {navigation?.items?.map((item, i) => (
              <div key={i}>
                {item.url ? (
                  <Link
                    href={item.url}
                    className="block py-2 text-foreground hover:text-primary font-medium"
                    target={item.openInNewTab ? '_blank' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="block py-2 font-medium text-foreground">{item.label}</span>
                )}
                {item.children && item.children.length > 0 && (
                  <div className="ml-4 mt-1 flex flex-col gap-2">
                    {item.children.map((child, j) => (
                      <Link
                        key={j}
                        href={child.url}
                        className="block py-1.5 text-sm text-muted-foreground hover:text-primary"
                        target={child.openInNewTab ? '_blank' : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {navigation?.admissionsButton && (
              <LinkButton
                href={navigation.admissionsButton.url}
                variant={navigation.admissionsButton.variant ?? 'outline'}
                className="mt-2 w-full justify-center"
                target={navigation.admissionsButton.openInNewTab ? '_blank' : undefined}
                onClick={() => setOpen(false)}
              >
                {navigation.admissionsButton.label}
              </LinkButton>
            )}
            {navigation?.ctaButton && (
              <LinkButton
                href={navigation.ctaButton.url}
                variant={navigation.ctaButton.variant ?? 'primary'}
                className="mt-2 w-full justify-center"
                target={navigation.ctaButton.openInNewTab ? '_blank' : undefined}
                onClick={() => setOpen(false)}
              >
                {navigation.ctaButton.label}
              </LinkButton>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
