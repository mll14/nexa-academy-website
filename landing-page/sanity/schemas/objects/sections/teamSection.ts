import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const teamSectionSchema = defineType({
  name: 'teamSection',
  title: 'Team Section',
  type: 'object',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'members', title: 'Team Members', type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'teamMember' }] })],
    }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `👥 Team — ${title ?? 'Untitled'}` }),
  },
})
