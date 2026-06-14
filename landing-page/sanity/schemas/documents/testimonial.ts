import { defineType, defineField } from 'sanity'

export const testimonialSchema = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', title: 'Role / Title', type: 'string' }),
    defineField({ name: 'company', title: 'Company', type: 'string' }),
    defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'rating', title: 'Rating (1–5)', type: 'number',
      validation: (r) => r.min(1).max(5), initialValue: 5 }),
    defineField({ name: 'avatar', title: 'Photo', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'avatarUrl', title: 'Photo URL (fallback)', type: 'url' }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'programSlug', title: 'Related Program', type: 'string',
      description: 'Optional slug of the program this person completed' }),
  ],
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'avatar' } },
})
