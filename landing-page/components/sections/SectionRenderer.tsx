import type { Section } from '@/types'
import { HeroSection } from './HeroSection'
import { StatsSection } from './StatsSection'
import { FeaturesSection } from './FeaturesSection'
import { TestimonialsSection } from './TestimonialsSection'
import { FaqSection } from './FaqSection'
import { CtaSection } from './CtaSection'
import { PartnersSection } from './PartnersSection'
import { ProgramsSection } from './ProgramsSection'
import { PricingSection } from './PricingSection'
import { RichTextSection } from './RichTextSection'
import { ImageTextSection } from './ImageTextSection'
import { ContactSection } from './ContactSection'
import { TeamSection } from './TeamSection'
import { VideoSection } from './VideoSection'
import { FinanceCalculatorSection } from './FinanceCalculatorSection'
import { ApplicationSection } from './ApplicationSection'
import LegalSection from './LegalSection'

interface SectionRendererProps {
  sections: Section[]
}

export function SectionRenderer({ sections }: SectionRendererProps) {
  return (
    <>
      {sections
        .filter((s) => !s.isHidden)
        .map((section) => {
          const key = section._key ?? section._type
          switch (section._type) {
            case 'heroSection': return <HeroSection key={key} section={section} />
            case 'statsSection': return <StatsSection key={key} section={section} />
            case 'featuresSection': return <FeaturesSection key={key} section={section} />
            case 'testimonialsSection': return <TestimonialsSection key={key} section={section} />
            case 'faqSection': return <FaqSection key={key} section={section} />
            case 'ctaSection': return <CtaSection key={key} section={section} />
            case 'partnersSection': return <PartnersSection key={key} section={section} />
            case 'programsSection': return <ProgramsSection key={key} section={section} />
            case 'pricingSection': return <PricingSection key={key} section={section} />
            case 'richTextSection': return <RichTextSection key={key} section={section} />
            case 'imageTextSection': return <ImageTextSection key={key} section={section} />
            case 'contactSection': return <ContactSection key={key} section={section} />
            case 'teamSection': return <TeamSection key={key} section={section} />
            case 'videoSection': return <VideoSection key={key} section={section} />
            case 'financeCalculatorSection': return <FinanceCalculatorSection key={key} section={section} />
            case 'applicationSection': return <ApplicationSection key={key} section={section} />
            case 'legalSection': return <LegalSection key={key} section={section} />
            default: return null
          }
        })}
    </>
  )
}
