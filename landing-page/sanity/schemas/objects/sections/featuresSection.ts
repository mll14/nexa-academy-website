import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const featuresSectionSchema = defineType({
  name: 'featuresSection',
  title: 'Features Section',
  type: 'object',
  description: 'Use for "Why Choose Us", "How it works", or any feature-card grid.',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'features',
      title: 'Feature Cards',
      type: 'array',
      validation: (r) => r.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'featureItem',
          fields: [
            defineField({
              name: 'iconName', title: 'Icon', type: 'string',
              placeholder: 'e.g. BookOpen, GraduationCap, Rocket',
              description: 'Browse all icons at lucide.dev/icons — click any icon, copy the name shown at the top (e.g. "GraduationCap"), and paste it here.',
            }),
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 3,
              validation: (r) => r.required() }),
            defineField({
              name: 'color', title: 'Card colour', type: 'string',
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
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
    }),
    defineField({
      name: 'layout', title: 'Card Layout', type: 'string',
      options: { list: [
        { title: 'Grid', value: 'grid' },
        { title: 'List (icon + text rows)', value: 'list' },
        { title: 'Journey (steps with arrows)', value: 'journey' },
      ], layout: 'radio' },
      initialValue: 'grid',
    }),
    defineField({
      name: 'columns', title: 'Columns (desktop)', type: 'number',
      options: { list: [
        { title: '2 columns', value: 2 },
        { title: '3 columns', value: 3 },
        { title: '4 columns', value: 4 },
      ] },
      initialValue: 3,
    }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `✨ Features — ${title ?? 'Untitled'}` }),
  },
})
