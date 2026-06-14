import { SectionWrapper } from './SectionWrapper'
import { TestimonialsCarousel } from './TestimonialsCarousel'
import type { TestimonialsSection as TestimonialsSectionType } from '@/types'

export function TestimonialsSection({ section }: { section: TestimonialsSectionType }) {
  return (
    <SectionWrapper section={section}>
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
        <div>
          <h2 className="font-semibold tracking-tight">{section.sectionTitle}</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto mt-2" />
        </div>
        {section.sectionSubtitle && (
          <p className="text-muted-foreground">{section.sectionSubtitle}</p>
        )}
      </div>
      <TestimonialsCarousel testimonials={section.testimonials} />
    </SectionWrapper>
  )
}
