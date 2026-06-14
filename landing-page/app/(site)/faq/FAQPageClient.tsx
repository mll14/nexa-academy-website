'use client'

import { useState, useMemo } from 'react'
import { HelpCircle, ArrowRight, Mail } from 'lucide-react'
import Link from 'next/link'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import type { FaqDoc } from '@/types'

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  general:    { title: 'General',              description: 'Common questions about Nexa Academy and our programs' },
  bootcamp:   { title: 'Software Engineering', description: 'Questions about our Software Engineering program' },
  cloud:      { title: 'Cloud & AI',           description: 'Questions about Cloud Computing and AI' },
  pricing:    { title: 'Pricing & Payments',   description: 'Questions about fees and payment plans' },
  admissions: { title: 'Admissions',           description: 'Questions about the admissions process' },
}

const TAB_LABELS: Record<string, string> = {
  bootcamp:   'Software Engineering',
  cloud:      'Cloud & AI',
  pricing:    'Pricing',
  admissions: 'Admissions',
  general:    'General',
}

type Category = { id: string; title: string; description: string; faqs: FaqDoc[] }

function FAQCategory({ category }: { category: Category }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold">{category.title}</h2>
        <p className="text-sm text-muted-foreground">{category.description}</p>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {category.faqs.map((faq, i) => (
          <AccordionItem key={faq._id ?? i} value={faq._id ?? String(i)}>
            <AccordionTrigger>
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

function FAQCta() {
  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-12 py-10 sm:py-14 text-center space-y-5">
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">Need more clarity?</h3>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">
        If your specific question is not covered here, our team can guide you through program
        selection and payment options.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white hover:bg-primary/90 px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Contact Support <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="mailto:admissions@nexaacademy.co.ke"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" /> Talk to Admissions
        </a>
      </div>
    </div>
  )
}

export function FAQPageClient({ faqs }: { faqs: FaqDoc[] }) {
  const [activeTab, setActiveTab] = useState('all')

  const categories = useMemo<Category[]>(() => {
    const grouped: Record<string, FaqDoc[]> = {}
    faqs.forEach((faq) => {
      const cat = faq.category ?? 'general'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(faq)
    })
    return Object.entries(grouped).map(([id, items]) => ({
      id,
      title: CATEGORY_META[id]?.title ?? id,
      description: CATEGORY_META[id]?.description ?? '',
      faqs: items,
    }))
  }, [faqs])

  const tabs = useMemo(
    () => [
      { id: 'all', label: 'All Questions' },
      ...categories.map((c) => ({ id: c.id, label: TAB_LABELS[c.id] ?? c.title })),
    ],
    [categories],
  )

  const visibleCategories =
    activeTab === 'all' ? categories : categories.filter((c) => c.id === activeTab)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-12 sm:space-y-16">
      {/* Hero */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="max-w-2xl">
            <h1 className="font-semibold tracking-tight">
              How can we <span className="text-primary">help?</span>
            </h1>
            <p className="text-muted-foreground py-1">
              Find answers to common questions about our programs, learning model, pricing, and
              admission process.
            </p>
          </div>
          <Badge variant="outline" className="border-primary text-primary text-xs shrink-0">
            Knowledge Base
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
            {faqs.length} questions answered
          </Badge>
          <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
            {categories.length} categories
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Tab filter */}
      <div className="overflow-x-auto pb-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* FAQ categories */}
      <div className="space-y-12">
        {visibleCategories.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No questions found.</p>
        ) : (
          visibleCategories.map((category) => (
            <FAQCategory key={category.id} category={category} />
          ))
        )}
      </div>

      <Separator />

      <FAQCta />
    </div>
  )
}
