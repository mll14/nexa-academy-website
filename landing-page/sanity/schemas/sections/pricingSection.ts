import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const pricingSectionSchema = defineType({
  name: 'pricingSection', title: 'Pricing', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'sectionSubtitle', type: 'string', title: 'Subtitle' }),
    defineField({
      name: 'plans', title: 'Plans', type: 'array',
      of: [{ type: 'object', fields: [
        defineField({ name: 'name', type: 'string', title: 'Plan name', validation: (r) => r.required() }),
        defineField({ name: 'price', type: 'string', title: 'Price (e.g. "KES 45,000")', validation: (r) => r.required() }),
        defineField({ name: 'period', type: 'string', title: 'Period (e.g. "month")' }),
        defineField({ name: 'description', type: 'string', title: 'Description' }),
        defineField({
          name: 'features', title: 'Features', type: 'array',
          of: [{ type: 'object', fields: [
            defineField({ name: 'text', type: 'string', title: 'Feature text', validation: (r) => r.required() }),
            defineField({ name: 'included', type: 'boolean', title: 'Included', initialValue: true }),
          ], preview: { select: { title: 'text', subtitle: 'included' } } }],
        }),
        defineField({ name: 'isPopular', type: 'boolean', title: 'Mark as popular', initialValue: false }),
        defineField({ name: 'cta', type: 'link', title: 'CTA button' }),
      ], preview: { select: { title: 'name', subtitle: 'price' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Pricing' }) },
})
