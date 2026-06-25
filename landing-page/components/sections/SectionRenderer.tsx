import type { Section } from '@/types'
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary'
import dynamic from 'next/dynamic'
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

// Heavy sections deferred into separate chunks — not needed on most pages
const VideoSection = dynamic(() => import('./VideoSection').then(m => ({ default: m.VideoSection })))
const FinanceCalculatorSection = dynamic(() => import('./FinanceCalculatorSection').then(m => ({ default: m.FinanceCalculatorSection })))
const ApplicationSection = dynamic(() => import('./ApplicationSection').then(m => ({ default: m.ApplicationSection })))
const LegalSection = dynamic(() => import('./LegalSection'))
const GallerySection = dynamic(() => import('./GallerySection').then(m => ({ default: m.GallerySection })))
const AppointmentFormSection = dynamic(() => import('./AppointmentFormSection').then(m => ({ default: m.AppointmentFormSection })))

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
          let node: React.ReactNode = null
          switch (section._type) {
            case 'heroSection': node = <HeroSection key={key} section={section} />; break
            case 'statsSection': node = <StatsSection key={key} section={section} />; break
            case 'featuresSection': node = <FeaturesSection key={key} section={section} />; break
            case 'testimonialsSection': node = <TestimonialsSection key={key} section={section} />; break
            case 'faqSection': node = <FaqSection key={key} section={section} />; break
            case 'ctaSection': node = <CtaSection key={key} section={section} />; break
            case 'partnersSection': node = <PartnersSection key={key} section={section} />; break
            case 'programsSection': node = <ProgramsSection key={key} section={section} />; break
            case 'pricingSection': node = <PricingSection key={key} section={section} />; break
            case 'richTextSection': node = <RichTextSection key={key} section={section} />; break
            case 'imageTextSection': node = <ImageTextSection key={key} section={section} />; break
            case 'contactSection': node = <ContactSection key={key} section={section} />; break
            case 'teamSection': node = <TeamSection key={key} section={section} />; break
            case 'videoSection': node = <VideoSection key={key} section={section} />; break
            case 'financeCalculatorSection': node = <FinanceCalculatorSection key={key} section={section} />; break
            case 'applicationSection': node = <ApplicationSection key={key} section={section} />; break
            case 'legalSection': node = <LegalSection key={key} section={section} />; break
            case 'gallerySection': node = <GallerySection key={key} section={section} />; break
            case 'appointmentFormSection': node = <AppointmentFormSection key={key} section={section} />; break
            default: return null
          }
          return (
            <SectionErrorBoundary key={key} sectionType={section._type}>
              {node}
            </SectionErrorBoundary>
          )
        })}
    </>
  )
}
