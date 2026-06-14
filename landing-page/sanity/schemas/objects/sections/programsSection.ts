import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const programsSectionSchema = defineType({
  name: 'programsSection',
  title: 'Programs Section',
  type: 'object',
  description: 'Programs are fetched live from the Nexa Academy API — not managed here.',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'layout', title: 'Display Layout', type: 'string',
      options: { list: [
        { title: 'Cards grid', value: 'cards' },
        { title: 'Horizontal list', value: 'list' },
      ], layout: 'radio' },
      initialValue: 'cards',
    }),
    defineField({ name: 'ctaLabel', title: 'View All Button Label', type: 'string' }),
    defineField({ name: 'ctaUrl', title: 'View All Button URL', type: 'string' }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `🎓 Programs — ${title ?? 'Untitled'}` }),
  },
})
