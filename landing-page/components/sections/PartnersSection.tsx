import { SectionWrapper } from './SectionWrapper'
import { SanityImage } from '@/components/shared/SanityImage'
import type { PartnersSection as PartnersSectionType } from '@/types'

export function PartnersSection({ section }: { section: PartnersSectionType }) {
  return (
    <SectionWrapper section={section}>
      {section.sectionTitle && (
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          {section.sectionTitle}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {section.partners?.map((p) => (
          <div key={p._id} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
            {p.logo?.asset ? (
              p.website ? (
                <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={p.name}>
                  <SanityImage image={p.logo} alt={p.name} width={120} height={40} className="h-10 w-auto object-contain" />
                </a>
              ) : (
                <SanityImage image={p.logo} alt={p.name} width={120} height={40} className="h-10 w-auto object-contain" />
              )
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{p.name}</span>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
