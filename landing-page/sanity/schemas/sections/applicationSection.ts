import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const applicationSectionSchema = defineType({
  name: 'applicationSection',
  title: 'Application Form',
  type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge Label', initialValue: 'Apply Now' }),
    defineField({ name: 'headline', type: 'string', title: 'Headline', initialValue: 'Start Your Application' }),
    defineField({ name: 'subheadline', type: 'text', title: 'Subheadline', rows: 2 }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare({ title }: { title?: string }) {
      return { title: title ?? 'Application Form' }
    },
  },
})
