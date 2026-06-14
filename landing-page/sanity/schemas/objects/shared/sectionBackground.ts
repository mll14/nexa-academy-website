import { defineType, defineField } from 'sanity'

export const sectionBackgroundSchema = defineType({
  name: 'sectionBackground',
  title: 'Background',
  type: 'object',
  fields: [
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          { title: 'White', value: 'white' },
          { title: 'Light Gray', value: 'light' },
          { title: 'Dark', value: 'dark' },
          { title: 'Brand Blue', value: 'primary' },
          { title: 'Gradient', value: 'gradient' },
        ],
        layout: 'radio',
      },
      initialValue: 'white',
    }),
  ],
})
