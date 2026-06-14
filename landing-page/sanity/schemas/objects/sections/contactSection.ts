import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const contactSectionSchema = defineType({
  name: 'contactSection',
  title: 'Contact Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({ name: 'showForm', title: 'Show contact form', type: 'boolean', initialValue: true }),
    defineField({ name: 'email', title: 'Email Address', type: 'string' }),
    defineField({ name: 'phone', title: 'Phone Number', type: 'string' }),
    defineField({ name: 'address', title: 'Physical Address', type: 'text', rows: 3 }),
    defineField({ name: 'mapEmbedUrl', title: 'Google Maps Embed URL', type: 'url',
      description: 'Google Maps → Share → Embed — paste the full src URL here' }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `📬 Contact — ${title ?? 'Untitled'}` }),
  },
})
