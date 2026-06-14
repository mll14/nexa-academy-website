import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const ctaSectionSchema = defineType({
  name: 'ctaSection', title: 'Call to Action', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'headline', type: 'string', title: 'Headline', validation: (r) => r.required() }),
    defineField({ name: 'subheadline', type: 'string', title: 'Subheadline' }),
    defineField({ name: 'description', type: 'text', title: 'Description', rows: 3 }),
    defineField({ name: 'primaryCta', type: 'link', title: 'Primary CTA' }),
    defineField({ name: 'secondaryCta', type: 'link', title: 'Secondary CTA' }),
    defineField({ name: 'layout', type: 'string', title: 'Layout',
      options: { list: ['centered', 'split'], layout: 'radio' }, initialValue: 'centered' }),
  ],
  preview: { select: { title: 'headline' }, prepare: ({ title }) => ({ title: `CTA: ${title ?? ''}` }) },
})
