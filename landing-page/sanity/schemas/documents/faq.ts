import { defineType, defineField } from 'sanity'

export const faqSchema = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'answer', title: 'Answer', type: 'text', rows: 5, validation: (r) => r.required() }),
    defineField({
      name: 'category', title: 'Category', type: 'string',
      options: { list: [
        { title: 'General', value: 'general' },
        { title: 'Bootcamp', value: 'bootcamp' },
        { title: 'Cloud / DevOps', value: 'cloud' },
        { title: 'Pricing & Payment', value: 'pricing' },
        { title: 'Admissions', value: 'admissions' },
        { title: 'Corporate Training', value: 'corporate' },
      ] },
      initialValue: 'general',
    }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
  ],
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
    { title: 'Category', name: 'category', by: [{ field: 'category', direction: 'asc' }] },
  ],
  preview: { select: { title: 'question', subtitle: 'category' } },
})
