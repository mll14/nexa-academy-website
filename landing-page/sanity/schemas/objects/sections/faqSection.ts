import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const faqSectionSchema = defineType({
  name: 'faqSection',
  title: 'FAQ Section',
  type: 'object',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'faqs',
      title: 'FAQ Items (from library)',
      type: 'array',
      description: 'Pick from the FAQ library. Drag to reorder.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })],
    }),
    defineField({
      name: 'inlineFaqs',
      title: 'Inline FAQs',
      description: 'One-off Q&As directly on this section, not shared in the FAQ library.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'inlineFaq',
          fields: [
            defineField({ name: 'question', type: 'string', title: 'Question', validation: (r) => r.required() }),
            defineField({ name: 'answer', type: 'text', title: 'Answer', rows: 4, validation: (r) => r.required() }),
          ],
          preview: { select: { title: 'question' } },
        }),
      ],
    }),
    defineField({ name: 'showCategories', title: 'Show category filter tabs', type: 'boolean', initialValue: false }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `❓ FAQ — ${title ?? 'Untitled'}` }),
  },
})
