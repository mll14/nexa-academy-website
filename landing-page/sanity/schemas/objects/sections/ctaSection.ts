import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const ctaSectionSchema = defineType({
  name: 'ctaSection',
  title: 'Call-to-Action Section',
  type: 'object',
  fields: [
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'subheadline', title: 'Sub-headline', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({ name: 'primaryCta', title: 'Primary Button', type: 'link' }),
    defineField({ name: 'secondaryCta', title: 'Secondary Button', type: 'link' }),
    defineField({
      name: 'layout', title: 'Layout', type: 'string',
      options: { list: [
        { title: 'Centered', value: 'centered' },
        { title: 'Split (text left, buttons right)', value: 'split' },
      ], layout: 'radio' },
      initialValue: 'centered',
    }),
    ...base,
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: `🚀 CTA — ${title ?? 'Untitled'}` }),
  },
})
