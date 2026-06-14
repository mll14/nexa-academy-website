import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const statsSectionSchema = defineType({
  name: 'statsSection',
  title: 'Stats Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      validation: (r) => r.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            defineField({ name: 'value', title: 'Number / Value', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'prefix', title: 'Prefix', type: 'string', description: 'E.g. "+"' }),
            defineField({ name: 'suffix', title: 'Suffix', type: 'string', description: 'E.g. "+" or "%"' }),
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'description', title: 'Sub-label', type: 'string' }),
            defineField({ name: 'iconName', title: 'Icon Name', type: 'string',
              description: 'Lucide icon name, e.g. Users' }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({
      name: 'layout', title: 'Layout', type: 'string',
      options: { list: [
        { title: 'Single row', value: 'row' },
        { title: 'Grid (2-col on mobile)', value: 'grid' },
      ], layout: 'radio' },
      initialValue: 'row',
    }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle', stats: 'stats' },
    prepare: ({ title, stats }) => ({
      title: `📊 Stats — ${title ?? `${(stats ?? []).length} items`}`,
    }),
  },
})
