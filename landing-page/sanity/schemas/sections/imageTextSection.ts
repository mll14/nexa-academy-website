import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const imageTextSectionSchema = defineType({
  name: 'imageTextSection', title: 'Image + Text', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'image', type: 'image', title: 'Image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'headline', type: 'string', title: 'Headline', validation: (r) => r.required() }),
    defineField({ name: 'body', type: 'blockContent', title: 'Body text' }),
    defineField({
      name: 'bulletPoints', title: 'Bullet points', type: 'array',
      of: [{ type: 'object', fields: [
        defineField({ name: 'text', type: 'string', title: 'Point', validation: (r) => r.required() }),
      ], preview: { select: { title: 'text' } } }],
    }),
    defineField({ name: 'cta', type: 'link', title: 'CTA button' }),
    defineField({ name: 'imagePosition', type: 'string', title: 'Image position',
      options: { list: ['left', 'right'], layout: 'radio' }, initialValue: 'left' }),
  ],
  preview: { select: { title: 'headline' }, prepare: ({ title }) => ({ title: `Image+Text: ${title ?? ''}` }) },
})
