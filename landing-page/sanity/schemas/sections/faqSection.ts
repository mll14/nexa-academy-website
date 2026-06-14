import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const faqSectionSchema = defineType({
  name: 'faqSection', title: 'FAQ', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'faqs', title: 'FAQs (from library)', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'faq' }] }] }),
    defineField({
      name: 'inlineFaqs', title: 'Inline FAQs', type: 'array',
      description: 'FAQs written directly here (not from library)',
      of: [{ type: 'object', fields: [
        defineField({ name: 'question', type: 'string', title: 'Question', validation: (r) => r.required() }),
        defineField({ name: 'answer', type: 'text', title: 'Answer', rows: 4, validation: (r) => r.required() }),
      ], preview: { select: { title: 'question' } } }],
    }),
    defineField({ name: 'showCategories', type: 'boolean', title: 'Show category filters', initialValue: false }),
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: `FAQ: ${title ?? ''}` }) },
})
