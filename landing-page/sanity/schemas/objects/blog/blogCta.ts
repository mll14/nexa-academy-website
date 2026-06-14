import { defineType, defineField } from 'sanity'
import { RocketIcon } from '@sanity/icons'

export const blogCtaSchema = defineType({
  name: 'blogCta',
  title: 'Call to Action',
  type: 'object',
  icon: RocketIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
    defineField({
      name: 'buttonText',
      title: 'Button Text',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'buttonUrl',
      title: 'Button URL',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          { title: 'Primary', value: 'primary' },
          { title: 'Subtle', value: 'subtle' },
          { title: 'Dark', value: 'dark' },
        ],
        layout: 'radio',
      },
      initialValue: 'primary',
    }),
  ],
  preview: {
    select: { title: 'title', buttonText: 'buttonText' },
    prepare({ title, buttonText }) {
      return { title: `CTA: ${title}`, subtitle: buttonText }
    },
  },
})
