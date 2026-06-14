import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const partnersSectionSchema = defineType({
  name: 'partnersSection',
  title: 'Partners / Logos Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'partners',
      title: 'Partners',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'partner' }] })],
    }),
    defineField({
      name: 'layout', title: 'Layout', type: 'string',
      options: { list: [
        { title: 'Scrolling row', value: 'carousel' },
        { title: 'Static grid', value: 'grid' },
      ], layout: 'radio' },
      initialValue: 'carousel',
    }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `🤝 Partners — ${title ?? 'Untitled'}` }),
  },
})
