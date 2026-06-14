import { SectionWrapper } from './SectionWrapper'
import { LinkButton } from '@/components/ui/Button'
import type { CtaSection as CtaSectionType } from '@/types'

export function CtaSection({ section }: { section: CtaSectionType }) {
  return (
    <SectionWrapper section={section}>
      <div className="rounded-3xl bg-primary/10 px-8 sm:px-16 py-12 sm:py-16 text-center max-w-3xl mx-auto">
        {section.headline && (
          <h2 className="font-bold tracking-tight text-foreground">{section.headline}</h2>
        )}
        {section.subheadline && (
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{section.subheadline}</p>
        )}
        {section.description && (
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{section.description}</p>
        )}
        {(section.primaryCta || section.secondaryCta) && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
            {section.primaryCta && (
              <LinkButton
                href={section.primaryCta.url}
                variant={section.primaryCta.variant ?? 'primary'}
                size="lg"
                className="rounded-full"
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
    </SectionWrapper>
  )
}
