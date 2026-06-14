import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string', description: 'Used as the HTML id for anchor links' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const heroSectionSchema = defineType({
  name: 'heroSection', title: 'Hero', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', title: 'Badge text', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'subheadline', title: 'Subheadline', type: 'text', rows: 2 }),
    defineField({ name: 'primaryCta', title: 'Primary CTA', type: 'link' }),
    defineField({ name: 'secondaryCta', title: 'Secondary CTA', type: 'link' }),
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'videoUrl', title: 'Video URL', type: 'url' }),
    defineField({ name: 'layout', title: 'Layout', type: 'string',
      options: { list: ['centered', 'split', 'fullWidth'], layout: 'radio' }, initialValue: 'centered' }),
  ],
  preview: { select: { title: 'headline', subtitle: 'layout' }, prepare: ({ title, subtitle }) => ({ title: `Hero: ${title ?? ''}`, subtitle }) },
})
