import { defineType, defineField } from 'sanity'

const sectionTypes = [
  { type: 'heroSection' },
  { type: 'featuresSection' },
  { type: 'imageTextSection' },
  { type: 'gallerySection' },
  { type: 'testimonialsSection' },
  { type: 'statsSection' },
  { type: 'ctaSection' },
  { type: 'faqSection' },
  { type: 'richTextSection' },
  { type: 'videoSection' },
  { type: 'appointmentFormSection' },
]

export const appointmentsPageSchema = defineType({
  name: 'appointmentsPage',
  title: 'Appointments Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      initialValue: 'Appointments Page',
      description: 'For Studio reference only — not shown on the site.',
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: sectionTypes,
      options: {
        insertMenu: {
          groups: [
            { name: 'hero', title: 'Hero', of: ['heroSection'] },
            { name: 'content', title: 'Content', of: ['featuresSection', 'imageTextSection', 'richTextSection', 'gallerySection', 'videoSection'] },
            { name: 'social', title: 'Social Proof', of: ['testimonialsSection', 'statsSection'] },
            { name: 'conversion', title: 'Conversion', of: ['ctaSection', 'appointmentFormSection'] },
            { name: 'other', title: 'Other', of: ['faqSection'] },
          ],
        },
      },
    }),
  ],
  preview: { prepare: () => ({ title: 'Appointments Page' }) },
})
