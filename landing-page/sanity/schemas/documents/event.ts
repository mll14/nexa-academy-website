import { defineType, defineField } from 'sanity'

// Rendered at /events and /events/[slug].
export const eventSchema = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Event Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug',
      options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({ name: 'startDate', title: 'Start Date & Time', type: 'datetime', validation: (r) => r.required() }),
    defineField({ name: 'endDate', title: 'End Date & Time', type: 'datetime' }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'blockContent' }),
    defineField({ name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'registrationUrl', title: 'Registration URL', type: 'url' }),
    defineField({
      name: 'status', title: 'Status', type: 'string',
      options: { list: [
        { title: 'Upcoming', value: 'upcoming' },
        { title: 'Ongoing', value: 'ongoing' },
        { title: 'Past', value: 'past' },
        { title: 'Cancelled', value: 'cancelled' },
      ] },
      initialValue: 'upcoming',
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  preview: { select: { title: 'title', subtitle: 'startDate', media: 'coverImage' } },
})
