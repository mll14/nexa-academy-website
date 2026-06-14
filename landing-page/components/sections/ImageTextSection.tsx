import { SectionWrapper } from './SectionWrapper'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { SanityImage } from '@/components/shared/SanityImage'
import { PortableTextRenderer } from '@/components/shared/PortableTextRenderer'
import { cn } from '@/lib/utils'
import type { ImageTextSection as ImageTextSectionType } from '@/types'

export function ImageTextSection({ section }: { section: ImageTextSectionType }) {
  const imageRight = section.imagePosition === 'right'
  return (
    <SectionWrapper section={section}>
      <div className={cn('grid md:grid-cols-2 gap-12 items-center', imageRight && 'md:[&>*:first-child]:order-last')}>
        {section.image?.asset && (
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <SanityImage image={section.image} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        )}
        <div>
          {section.badge && <Badge className="mb-4">{section.badge}</Badge>}
          {section.headline && (
            <h2 className="font-semibold tracking-tight">{section.headline}</h2>
          )}
          {section.body && (
            <div className="mt-4">
              <PortableTextRenderer value={section.body} />
            </div>
          )}
          {section.bulletPoints && section.bulletPoints.length > 0 && (
            <ul className="mt-4 space-y-2">
              {section.bulletPoints.map((bp, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground/80">
                  <span className="mt-1 flex-shrink-0 text-primary">✓</span>
                  {bp.text}
                </li>
              ))}
            </ul>
          )}
          {section.cta && (
            <div className="mt-6">
              <LinkButton
                href={section.cta.url}
                variant={section.cta.variant ?? 'primary'}
                target={section.cta.openInNewTab ? '_blank' : undefined}
              >
                {section.cta.label}
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  )
}
