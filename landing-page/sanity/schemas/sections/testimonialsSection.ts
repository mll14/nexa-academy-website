import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const testimonialsSectionSchema = defineType({
  name: 'testimonialsSection', title: 'Testimonials', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'sectionSubtitle', type: 'text', title: 'Subtitle', rows: 2 }),
    defineField({
      name: 'testimonials', title: 'Testimonials', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'testimonial' }] }],
    }),
    defineField({ name: 'layout', type: 'string', title: 'Layout',
      options: { list: ['carousel', 'grid', 'masonry'], layout: 'radio' }, initialValue: 'grid' }),
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: `Testimonials: ${title ?? ''}` }) },
})
