import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const financeCalculatorSectionSchema = defineType({
  name: 'financeCalculatorSection',
  title: 'Finance Calculator',
  type: 'object',
  fields: [
    ...base,
    defineField({ name: 'sectionTitle', type: 'string', title: 'Section Title' }),
    defineField({ name: 'sectionSubtitle', type: 'text', title: 'Subtitle', rows: 2 }),
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare({ title }: { title?: string }) {
      return { title: title ?? 'Finance Calculator' }
    },
  },
})
