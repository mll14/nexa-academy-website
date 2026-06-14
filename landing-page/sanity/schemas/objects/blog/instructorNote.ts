import { defineType, defineField } from 'sanity'
import { InfoOutlineIcon } from '@sanity/icons'

export const instructorNoteSchema = defineType({
  name: 'instructorNote',
  title: 'Callout / Note',
  type: 'object',
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'ℹ️ Info', value: 'info' },
          { title: '💡 Tip', value: 'tip' },
          { title: '⚠️ Warning', value: 'warning' },
          { title: '🔑 Important', value: 'important' },
          { title: '👨‍🏫 Instructor Note', value: 'instructor' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({ name: 'title', title: 'Title (optional)', type: 'string' }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 4,
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { type: 'type', title: 'title', content: 'content' },
    prepare({ type, title, content }) {
      const icons: Record<string, string> = {
        info: 'ℹ️', tip: '💡', warning: '⚠️', important: '🔑', instructor: '👨‍🏫',
      }
      return {
        title: `${icons[type] ?? '📝'} ${title ?? type ?? 'Note'}`,
        subtitle: content,
      }
    },
  },
})
