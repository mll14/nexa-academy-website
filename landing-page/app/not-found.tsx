import Link from 'next/link'
import { Home, Search, BookOpen, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { GoBackButton } from '@/components/ui/GoBackButton'

const quickLinks = [
  { label: 'Browse Programs', href: '/programs', icon: BookOpen },
  { label: 'Apply Now', href: 'https://admissions.nexaacademy.co.ke', icon: Search },
  { label: 'Contact Us', href: '/contact', icon: Phone },
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* 404 Hero */}
          <div className="space-y-4">
            <Badge className="text-primary border-primary/30">Error 404</Badge>

            {/* Big 404 */}
            <div className="relative select-none">
              <p
                className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 40%, transparent) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                404
              </p>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-primary/5 blur-3xl" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground -mt-4">
              Page not found
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              Looks like this page took a wrong turn. The page you&apos;re looking
              for doesn&apos;t exist or may have been moved.
            </p>
          </div>

          <hr className="max-w-xs mx-auto border-border" />

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              Here are some helpful links instead:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {quickLinks.map(({ label, href, icon: Icon }) => (
                <LinkButton
                  key={label}
                  href={href}
                  variant="outline"
                  size="sm"
                  className="border-border hover:border-primary"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </LinkButton>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <LinkButton href="/" variant="primary" size="md" className="px-8">
              <Home className="w-4 h-4" />
              Back to Home
            </LinkButton>
            <GoBackButton />
          </div>
        </div>
      </main>

      <div className="border-t border-border py-5 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 Nexa Academy.{' '}
          <Link href="/contact" className="hover:text-primary transition-colors">
            Need help?
          </Link>
        </p>
      </div>
    </div>
  )
}
