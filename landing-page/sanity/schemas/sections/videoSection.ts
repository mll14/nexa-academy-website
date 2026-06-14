import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const videoSectionSchema = defineType({
  name: 'videoSection', title: 'Video', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'videoUrl', type: 'url', title: 'Video URL (YouTube or Vimeo)' }),
    defineField({ name: 'thumbnail', type: 'image', title: 'Thumbnail (shown before play)',
      options: { hotspot: true }, fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'caption', type: 'string', title: 'Caption' }),
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: `Video: ${title ?? ''}` }) },
})
