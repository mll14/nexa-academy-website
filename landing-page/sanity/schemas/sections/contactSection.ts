import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const contactSectionSchema = defineType({
  name: 'contactSection', title: 'Contact', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'showForm', type: 'boolean', title: 'Show contact form', initialValue: true }),
    defineField({ name: 'email', type: 'string', title: 'Contact email' }),
    defineField({ name: 'phone', type: 'string', title: 'Phone number' }),
    defineField({ name: 'address', type: 'text', title: 'Physical address', rows: 3 }),
    defineField({ name: 'mapEmbedUrl', type: 'url', title: 'Google Maps embed URL' }),
  ],
  preview: { prepare: () => ({ title: 'Contact' }) },
})
