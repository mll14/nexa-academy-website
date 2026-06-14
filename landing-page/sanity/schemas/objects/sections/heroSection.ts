import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string',
    description: 'Optional. E.g. "hero" creates a /page#hero anchor link.' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const heroSectionSchema = defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'object',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string',
      description: 'Small text above the headline, e.g. "Applications now open"' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'subheadline', title: 'Subheadline', type: 'text', rows: 3 }),
    defineField({ name: 'primaryCta', title: 'Primary Button', type: 'link' }),
    defineField({ name: 'secondaryCta', title: 'Secondary Button', type: 'link' }),
    defineField({ name: 'image', title: 'Feature Image', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'videoUrl', title: 'Video URL', type: 'url',
      description: 'Optional YouTube or Vimeo embed URL' }),
    defineField({
      name: 'layout', title: 'Layout', type: 'string',
      options: {
        list: [
          { title: 'Centered (text + image stacked)', value: 'centered' },
          { title: 'Split (text left, image right)', value: 'split' },
          { title: 'Full-width (image as background)', value: 'fullWidth' },
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
    }),
    ...base,
  ],
  preview: {
    select: { title: 'headline', subtitle: 'subheadline' },
    prepare: ({ title, subtitle }) => ({
      title: `🦸 Hero — ${title ?? 'Untitled'}`,
      subtitle,
    }),
  },
})
