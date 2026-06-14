import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const featuresSectionSchema = defineType({
  name: 'featuresSection', title: 'Features', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', type: 'text', title: 'Subtitle', rows: 2 }),
    defineField({
      name: 'features', title: 'Features', type: 'array',
      of: [{ type: 'object', fields: [
        defineField({
          name: 'iconName', type: 'string', title: 'Icon',
          placeholder: 'e.g. BookOpen, GraduationCap, Rocket',
          description: 'Browse all icons at lucide.dev/icons — click any icon, copy the name shown at the top (e.g. "GraduationCap"), and paste it here.',
        }),
        defineField({ name: 'title', type: 'string', title: 'Title', validation: (r) => r.required() }),
        defineField({ name: 'description', type: 'text', title: 'Description', rows: 3 }),
        defineField({
          name: 'color', type: 'string', title: 'Card colour',
          options: {
            list: [
              { title: '🟢 Green – light tint',  value: 'primary-tint' },
              { title: '🟢 Green – filled',       value: 'primary-solid' },
              { title: '🔵 Blue – light tint',   value: 'secondary-tint' },
              { title: '🔵 Blue – filled',        value: 'secondary-solid' },
              { title: '⬜ Neutral / Grey',        value: 'neutral' },
              { title: '🤍 White',                value: 'white' },
            ],
            layout: 'dropdown',
          },
          initialValue: 'primary-tint',
        }),
      ], preview: { select: { title: 'title' } } }],
    }),
    defineField({ name: 'layout', type: 'string', title: 'Layout',
      options: { list: ['grid', 'list', 'journey'], layout: 'radio' }, initialValue: 'grid' }),
    defineField({ name: 'columns', type: 'number', title: 'Columns',
      options: { list: [{ title: '2', value: 2 }, { title: '3', value: 3 }, { title: '4', value: 4 }], layout: 'radio' }, initialValue: 3 }),
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: `Features: ${title ?? ''}` }) },
})
