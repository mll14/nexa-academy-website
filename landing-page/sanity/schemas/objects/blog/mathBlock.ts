import { defineType, defineField } from 'sanity'

export const mathBlockSchema = defineType({
  name: 'mathBlock',
  title: 'Math Equation',
  type: 'object',
  fields: [
    defineField({
      name: 'latex',
      title: 'LaTeX',
      description: 'Enter a valid LaTeX expression, e.g. E = mc^2',
      type: 'text',
      rows: 4,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    defineField({
      name: 'displayMode',
      title: 'Display as block (centred)',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { latex: 'latex' },
    prepare({ latex }) {
      return { title: '∑ Math Equation', subtitle: latex }
    },
  },
})
