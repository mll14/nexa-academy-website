import Link from 'next/link'
import { SanityImage } from '@/components/shared/SanityImage'
import { LinkButton } from '@/components/ui/Button'
import { MobileNav } from './MobileNav'
import { AnnouncementBar } from './AnnouncementBar'
import type { Navigation, SiteSettings } from '@/types'

interface HeaderProps {
  navigation: Navigation | null
  settings: SiteSettings | null
}

export function Header({ navigation, settings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {settings?.announcementBar && <AnnouncementBar bar={settings.announcementBar} />}
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex h-18 items-center justify-between py-4">
          {/* Logo */}
          <div className='flex flex-row gap-1 items-center justify-center'>
          <Link href="/" className="flex items-center gap-2">
            {settings?.logo?.asset ? (
              <SanityImage
                image={settings.logo}
                alt={settings.siteName ?? 'Nexa Academy'}
                width={140}
                height={36}
                className="h-9 w-auto"
                priority
              />
            ) : (
              <span className="text-xl font-bold text-primary">
                {settings?.logoText ?? settings?.siteName ?? 'Nexa Academy'}
              </span>
            )}
          </Link>
          <p className='max-lg:hidden *:**:not-[]: font-semibold'>{settings?.siteName ?? "Nexa Academy"}</p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation?.items?.map((item, i) => (
              <div key={i} className="relative group">
                {item.url ? (
                  <Link
                    href={item.url}
                    className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                    target={item.openInNewTab ? '_blank' : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                    {item.label}
                  </button>
                )}
                {item.children && item.children.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-2">
                      {item.children.map((child, j) => (
                        <Link
                          key={j}
                          href={child.url}
                          className="block rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-primary transition-colors"
                          target={child.openInNewTab ? '_blank' : undefined}
                        >
                          <div className="font-medium">{child.label}</div>
                          {child.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{child.description}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/legal"
              className="text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
            >
              Privacy &amp; Terms
            </Link>
          </nav>

          {/* CTA + mobile menu */}
          <div className="flex items-center gap-3">
            {navigation?.admissionsButton && (
              <LinkButton
                href={navigation.admissionsButton.url}
                variant={navigation.admissionsButton.variant ?? 'outline'}
                size="sm"
                className="hidden md:inline-flex"
                target={navigation.admissionsButton.openInNewTab ? '_blank' : undefined}
              >
                {navigation.admissionsButton.label}
              </LinkButton>
            )}
            {navigation?.ctaButton && (
              <LinkButton
                href={navigation.ctaButton.url}
                variant={navigation.ctaButton.variant ?? 'primary'}
                size="sm"
                className="hidden md:inline-flex"
                target={navigation.ctaButton.openInNewTab ? '_blank' : undefined}
              >
                {navigation.ctaButton.label}
              </LinkButton>
            )}
            <MobileNav navigation={navigation} />
          </div>
        </div>
      </div>
    </header>
  )
}
