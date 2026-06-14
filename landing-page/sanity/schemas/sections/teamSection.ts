import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const teamSectionSchema = defineType({
  name: 'teamSection', title: 'Team', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'members', title: 'Team members', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }] }),
  ],
  preview: { prepare: () => ({ title: 'Team' }) },
})
