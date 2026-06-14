import { defineType, defineField } from 'sanity'
import { PlayIcon } from '@sanity/icons'

export const videoEmbedSchema = defineType({
  name: 'videoEmbed',
  title: 'Video Embed',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'YouTube or Vimeo URL',
      type: 'url',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'caption', title: 'Caption', type: 'string' }),
    defineField({
      name: 'startAt',
      title: 'Start at (seconds)',
      type: 'number',
    }),
  ],
  preview: {
    select: { caption: 'caption', url: 'url' },
    prepare({ caption, url }) {
      return { title: caption || 'Video', subtitle: url }
    },
  },
})
