import { defineType, defineField } from 'sanity'

export const faqSchema = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question',       title: 'Question',         type: 'string',  validation: r => r.required() }),
    defineField({ name: 'answer',         title: 'Answer',           type: 'text',    validation: r => r.required() }),
    defineField({ name: 'category',       title: 'Category',         type: 'string',
      options: { list: ['general', 'bootcamp', 'cloud', 'pricing', 'admissions'] }, initialValue: 'general' }),
    defineField({ name: 'showOnHomepage', title: 'Show on Homepage', type: 'boolean', initialValue: false }),
    defineField({ name: 'isActive',       title: 'Active',           type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder',      title: 'Sort Order',       type: 'number',  initialValue: 0 }),
  ],
})
