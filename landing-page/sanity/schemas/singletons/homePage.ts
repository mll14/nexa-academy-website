import { defineType, defineField } from 'sanity'

const sectionTypes = [
  { type: 'heroSection' },
  { type: 'statsSection' },
  { type: 'featuresSection' },
  { type: 'testimonialsSection' },
  { type: 'faqSection' },
  { type: 'ctaSection' },
  { type: 'partnersSection' },
  { type: 'programsSection' },
  { type: 'pricingSection' },
  { type: 'richTextSection' },
  { type: 'imageTextSection' },
  { type: 'contactSection' },
  { type: 'teamSection' },
  { type: 'videoSection' },
]

export const homePageSchema = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Internal Title', type: 'string',
      description: 'For Studio reference only — not shown on the site',
      initialValue: 'Home Page' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: sectionTypes,
      options: { insertMenu: { groups: [
        { name: 'hero', title: 'Hero', of: ['heroSection'] },
        { name: 'content', title: 'Content', of: ['featuresSection','richTextSection','imageTextSection','videoSection'] },
        { name: 'social', title: 'Social Proof', of: ['statsSection','testimonialsSection','partnersSection','teamSection'] },
        { name: 'conversion', title: 'Conversion', of: ['ctaSection','pricingSection','contactSection'] },
        { name: 'programs', title: 'Programs & FAQs', of: ['programsSection','faqSection'] },
      ] } },
    }),
  ],
  preview: { prepare: () => ({ title: 'Home Page' }) },
})
