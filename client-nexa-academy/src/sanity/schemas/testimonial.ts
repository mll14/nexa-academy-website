import { defineType, defineField } from 'sanity'

export const testimonialSchema = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'name',      title: 'Name',       type: 'string', validation: r => r.required() }),
    defineField({ name: 'role',      title: 'Role',       type: 'string' }),
    defineField({ name: 'quote',     title: 'Quote',      type: 'text',   validation: r => r.required() }),
    defineField({ name: 'rating',    title: 'Rating',     type: 'number', initialValue: 5 }),
    defineField({ name: 'avatarUrl', title: 'Avatar URL', type: 'url' }),
    defineField({ name: 'isActive',  title: 'Active',     type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number',  initialValue: 0 }),
  ],
})
