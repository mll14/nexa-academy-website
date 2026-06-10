import { defineType, defineField } from 'sanity'

export const announcementSchema = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'number',
      description: 'Higher number = shown first (0–10)',
      initialValue: 0,
      validation: (r) => r.min(0).max(10),
    }),
    defineField({
      name: 'targetAudience',
      title: 'Show To',
      type: 'string',
      options: {
        list: [
          { title: 'Everyone', value: 'all' },
          { title: 'Logged-in Students Only', value: 'students' },
          { title: 'Visitors Only (not logged in)', value: 'visitors' },
        ],
        layout: 'radio',
      },
      initialValue: 'all',
    }),
    defineField({
      name: 'dismissible',
      title: 'Can be dismissed by users',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
