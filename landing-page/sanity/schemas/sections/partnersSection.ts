import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const partnersSectionSchema = defineType({
  name: 'partnersSection', title: 'Partners', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'sectionTitle', type: 'string', title: 'Label (e.g. "Trusted by")' }),
    defineField({ name: 'partners', title: 'Partners', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'partner' }] }] }),
    defineField({ name: 'layout', type: 'string', title: 'Layout',
      options: { list: ['carousel', 'grid'], layout: 'radio' }, initialValue: 'grid' }),
  ],
  preview: { prepare: () => ({ title: 'Partners' }) },
})
