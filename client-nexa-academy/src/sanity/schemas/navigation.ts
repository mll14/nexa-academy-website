import { defineType, defineField } from 'sanity'

const linkFields = [
  defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    description: 'Text shown in the nav, e.g. "Programs"',
    validation: (r) => r.required(),
  }),
  defineField({
    name: 'url',
    title: 'URL',
    type: 'string',
    description: 'Use /path for internal pages or https://... for external links',
    validation: (r) => r.required(),
  }),
  defineField({
    name: 'openInNewTab',
    title: 'Open in new tab',
    type: 'boolean',
    initialValue: false,
  }),
]

export default defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Navigation Links',
      type: 'array',
      description: 'The links shown in the header. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'navItem',
          fields: [
            ...linkFields,
            defineField({
              name: 'children',
              title: 'Dropdown Items',
              type: 'array',
              description: 'Optional sub-links shown in a dropdown menu',
              of: [
                {
                  type: 'object',
                  name: 'navChild',
                  fields: linkFields,
                  preview: { select: { title: 'label', subtitle: 'url' } },
                },
              ],
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
    }),
  ],
})
