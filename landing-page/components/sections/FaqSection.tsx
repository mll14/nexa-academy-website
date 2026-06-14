import Link from 'next/link'
import { HelpCircle, ArrowRight } from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion'
import type { FaqSection as FaqSectionType } from '@/types'

export function FaqSection({ section }: { section: FaqSectionType }) {
  const allFaqs = [...(section.faqs ?? []), ...(section.inlineFaqs ?? [])]

  return (
    <SectionWrapper section={section}>
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="font-semibold tracking-tight">{section.sectionTitle}</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
          {section.sectionSubtitle && (
            <p className="text-muted-foreground">{section.sectionSubtitle}</p>
          )}
        </div>

        {/* Accordion */}
        <Accordion type="multiple">
          {allFaqs.map((faq, i) => (
            <AccordionItem key={faq._id ?? i} value={faq._id ?? String(i)}>
              <AccordionTrigger>
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                <span>{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* See all link */}
        <div className="text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-xl border border-primary text-primary px-5 py-2.5 text-sm font-medium hover:bg-primary hover:text-white transition-colors"
          >
            See all questions <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </SectionWrapper>
  )
}
