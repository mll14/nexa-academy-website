import { Check } from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { LinkButton } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { PricingSection as PricingSectionType } from '@/types'

export function PricingSection({ section }: { section: PricingSectionType }) {
  return (
    <SectionWrapper section={section}>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-foreground">{section.sectionTitle}</h2>
        {section.sectionSubtitle && (
          <p className="mt-3 text-muted-foreground">{section.sectionSubtitle}</p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {section.plans?.map((plan, i) => (
          <div
            key={i}
            className={cn(
              'relative flex flex-col rounded-2xl border p-8',
              plan.isPopular
                ? 'border-green-500 bg-green-50'
                : 'border-border bg-white',
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-4 right-4">
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-foreground pr-24">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              )}
              {plan.price && (
                <p className="mt-4 text-xl font-bold text-foreground">{plan.price}</p>
              )}
            </div>
            {plan.features && plan.features.length > 0 && (
              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="text-foreground/80">{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {plan.cta && (
              <div className="mt-8">
                <LinkButton
                  href={plan.cta.url}
                  variant={plan.isPopular ? 'primary' : 'outline'}
                  size="md"
                  className="w-full justify-center"
                  target={plan.cta.openInNewTab ? '_blank' : undefined}
                >
                  {plan.cta.label}
                </LinkButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
