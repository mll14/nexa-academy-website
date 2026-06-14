import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const imageTextSectionSchema = defineType({
  name: 'imageTextSection',
  title: 'Image + Text Section',
  type: 'object',
  description: 'Two-column layout: image on one side, text on the other.',
  fields: [
    defineField({
      name: 'image', title: 'Image', type: 'image', options: { hotspot: true },
      validation: (r) => r.required(),
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'body', title: 'Body Text', type: 'blockContent' }),
    defineField({
      name: 'bulletPoints', title: 'Bullet Points', type: 'array',
      description: 'Checklist shown below the body text.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({ name: 'cta', title: 'Button', type: 'link' }),
    defineField({
      name: 'imagePosition', title: 'Image Position', type: 'string',
      options: { list: [
        { title: 'Right', value: 'right' },
        { title: 'Left', value: 'left' },
      ], layout: 'radio' },
      initialValue: 'right',
    }),
    ...base,
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: `🖼 Image + Text — ${title ?? 'Untitled'}` }),
  },
})
