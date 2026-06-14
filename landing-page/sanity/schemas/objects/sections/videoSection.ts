import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const videoSectionSchema = defineType({
  name: 'videoSection',
  title: 'Video Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({ name: 'videoUrl', title: 'Video URL', type: 'url',
      description: 'YouTube or Vimeo URL', validation: (r) => r.required() }),
    defineField({
      name: 'thumbnail', title: 'Custom Thumbnail', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({ name: 'caption', title: 'Caption', type: 'string' }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle', subtitle: 'videoUrl' },
    prepare: ({ title, subtitle }) => ({ title: `▶️ Video — ${title ?? subtitle ?? 'Untitled'}` }),
  },
})
