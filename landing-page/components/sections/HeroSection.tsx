import { LinkButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SanityImage } from '@/components/shared/SanityImage'
import { SectionWrapper } from './SectionWrapper'
import type { HeroSection as HeroSectionType } from '@/types'

export function HeroSection({ section }: { section: HeroSectionType }) {
  const isSplit = section.layout === 'split'

  return (
    <SectionWrapper
      section={section}
      containerSize="lg"
      className="py-12 sm:py-16 lg:py-20"
    >
      <div className={isSplit ? 'grid md:grid-cols-2 gap-10 lg:gap-16 items-center' : 'flex flex-col items-center text-center gap-5 sm:gap-6 max-w-3xl mx-auto'}>
        {/* Left / content column */}
        <div className={`flex flex-col gap-5 sm:gap-6 ${isSplit ? 'text-center md:text-left items-center md:items-start' : 'items-center'}`}>
          {section.badge && <Badge>{section.badge}</Badge>}

          {section.headline && (
            <h1 className="font-semibold leading-tight">
              {section.headline}
            </h1>
          )}

          {section.subheadline && (
            <p className="text-muted-foreground max-w-md">
              {section.subheadline}
            </p>
          )}

          {(section.primaryCta || section.secondaryCta) && (
            <div className={`flex flex-wrap items-center gap-3 ${!isSplit ? 'justify-center' : ''}`}>
              {section.primaryCta && (
                <LinkButton
                  href={section.primaryCta.url}
                  variant={section.primaryCta.variant ?? 'primary'}
                  size="lg"
                  target={section.primaryCta.openInNewTab ? '_blank' : undefined}
                >
                  {section.primaryCta.label}
                </LinkButton>
              )}
              {section.secondaryCta && (
                <LinkButton
                  href={section.secondaryCta.url}
                  variant={section.secondaryCta.variant ?? 'outline'}
                  size="lg"
                  target={section.secondaryCta.openInNewTab ? '_blank' : undefined}
                >
                  {section.secondaryCta.label}
                </LinkButton>
              )}
            </div>
          )}
        </div>

        {/* Right / image column — only in split layout */}
        {isSplit && section.image?.asset && (
          <div className="w-full h-80 sm:h-80 md:h-96 lg:h-[450px] rounded-2xl overflow-hidden relative">
            <div
              className="absolute inset-0 z-0"
              style={{
                background:
                  'radial-gradient(ellipse at 60% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%)',
              }}
            />
            <SanityImage
              image={section.image}
              fill
              className="object-cover relative z-10"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}
