import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const statsSectionSchema = defineType({
  name: 'statsSection', title: 'Stats', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({
      name: 'stats', title: 'Stats', type: 'array',
      of: [{ type: 'object', fields: [
        defineField({ name: 'value', type: 'string', title: 'Value', validation: (r) => r.required() }),
        defineField({ name: 'prefix', type: 'string', title: 'Prefix (e.g. "+")' }),
        defineField({ name: 'suffix', type: 'string', title: 'Suffix (e.g. "%")' }),
        defineField({ name: 'label', type: 'string', title: 'Label', validation: (r) => r.required() }),
        defineField({ name: 'description', type: 'string', title: 'Description' }),
        defineField({ name: 'iconName', type: 'string', title: 'Icon name' }),
      ], preview: { select: { title: 'value', subtitle: 'label' } } }],
    }),
    defineField({ name: 'layout', title: 'Layout', type: 'string',
      options: { list: ['row', 'grid'], layout: 'radio' }, initialValue: 'row' }),
  ],
  preview: { prepare: () => ({ title: 'Stats' }) },
})
