import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const richTextSectionSchema = defineType({
  name: 'richTextSection', title: 'Rich Text', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'content', type: 'blockContent', title: 'Content', validation: (r) => r.required() }),
    defineField({ name: 'width', type: 'string', title: 'Max width',
      options: { list: ['narrow', 'default', 'wide'], layout: 'radio' }, initialValue: 'default' }),
  ],
  preview: { prepare: () => ({ title: 'Rich Text' }) },
})
