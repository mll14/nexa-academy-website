import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const pricingSectionSchema = defineType({
  name: 'pricingSection',
  title: 'Pricing Section',
  type: 'object',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sectionSubtitle', title: 'Section Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'plans',
      title: 'Pricing Plans',
      type: 'array',
      validation: (r) => r.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pricingPlan',
          fields: [
            defineField({ name: 'name', title: 'Plan Name', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'price', title: 'Price', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'period', title: 'Period', type: 'string', description: 'E.g. "per cohort"' }),
            defineField({ name: 'description', title: 'Plan Description', type: 'text', rows: 2 }),
            defineField({ name: 'features', title: 'Features', type: 'array', of: [{ type: 'string' }] }),
            defineField({ name: 'isPopular', title: 'Mark as "Most Popular"', type: 'boolean', initialValue: false }),
            defineField({ name: 'cta', title: 'Button', type: 'link' }),
          ],
          preview: { select: { title: 'name', subtitle: 'price' } },
        }),
      ],
    }),
    ...base,
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare: ({ title }) => ({ title: `💰 Pricing — ${title ?? 'Untitled'}` }),
  },
})
