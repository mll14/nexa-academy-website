import { defineType, defineField } from 'sanity'

export const partnerSchema = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Partner Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'logo', title: 'Logo', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'website', title: 'Website URL', type: 'url' }),
    defineField({
      name: 'type', title: 'Partnership Type', type: 'string',
      options: { list: [
        { title: 'Hiring Partner', value: 'hiring' },
        { title: 'Technology Partner', value: 'technology' },
        { title: 'Training Partner', value: 'training' },
        { title: 'Community Partner', value: 'community' },
      ] },
    }),
    defineField({ name: 'isActive', title: 'Active', type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
  ],
  preview: { select: { title: 'name', subtitle: 'type', media: 'logo' } },
})
