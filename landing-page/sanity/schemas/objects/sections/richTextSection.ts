import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const richTextSectionSchema = defineType({
  name: 'richTextSection',
  title: 'Rich Text Section',
  type: 'object',
  description: 'Free-form long-form content — articles, policy pages, etc.',
  fields: [
    defineField({ name: 'content', title: 'Content', type: 'blockContent', validation: (r) => r.required() }),
    defineField({
      name: 'width', title: 'Content Width', type: 'string',
      options: { list: [
        { title: 'Narrow (readable prose width)', value: 'narrow' },
        { title: 'Default', value: 'default' },
        { title: 'Wide', value: 'wide' },
      ], layout: 'radio' },
      initialValue: 'default',
    }),
    ...base,
  ],
  preview: {
    prepare: () => ({ title: '📝 Rich Text' }),
  },
})
