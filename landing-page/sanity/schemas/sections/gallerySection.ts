import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const gallerySectionSchema = defineType({
  name: 'gallerySection',
  title: 'Photo Gallery',
  type: 'object',
  description: 'Grid of photos — great for showing your campus, classes, and team in action.',
  fields: [
    defineField({ name: 'badge', title: 'Badge Text', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string' }),
    defineField({ name: 'subheadline', title: 'Subheadline', type: 'text', rows: 2 }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      validation: (r) => r.min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'galleryPhoto',
          fields: [
            defineField({
              name: 'image',
              title: 'Photo',
              type: 'image',
              options: { hotspot: true },
              validation: (r) => r.required(),
              fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
            }),
            defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
          ],
          preview: {
            select: { media: 'image', title: 'caption' },
            prepare: ({ media, title }) => ({ media, title: title ?? 'Photo' }),
          },
        }),
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          { title: 'Uniform Grid (all same size)', value: 'grid' },
          { title: 'Masonry (varied heights)', value: 'masonry' },
          { title: 'Featured (1 large + rest small)', value: 'featured' },
        ],
        layout: 'radio',
      },
      initialValue: 'grid',
    }),
    defineField({
      name: 'columns',
      title: 'Columns (desktop)',
      type: 'number',
      options: {
        list: [
          { title: '2 columns', value: 2 },
          { title: '3 columns', value: 3 },
          { title: '4 columns', value: 4 },
        ],
      },
      initialValue: 3,
    }),
    ...base,
  ],
  preview: {
    select: { title: 'headline', media: 'photos.0.image' },
    prepare: ({ title, media }) => ({ media, title: `📷 Gallery — ${title ?? 'Untitled'}` }),
  },
})
