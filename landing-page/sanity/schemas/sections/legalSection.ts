import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const legalSectionSchema = defineType({
  name: 'legalSection',
  title: 'Legal / Tabbed Policy',
  type: 'object',
  fields: [
    ...base,
    defineField({
      name: 'pageTitle',
      title: 'Page Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pageSubtitle',
      title: 'Page Subtitle / Disclaimer',
      type: 'text',
      rows: 3,
      description: 'Short disclaimer shown below the title, above the tabs.',
    }),
    defineField({
      name: 'tabs',
      title: 'Policy Tabs',
      type: 'array',
      description: 'Add one tab per policy (e.g. Terms of Service, Privacy Policy, Cookies).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'legalTab',
          title: 'Tab',
          fields: [
            defineField({
              name: 'label',
              title: 'Tab Label',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'blockContent',
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'label' },
          },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'pageTitle' },
    prepare: ({ title }: { title?: string }) => ({
      title: `Legal: ${title ?? 'Untitled'}`,
    }),
  },
})
