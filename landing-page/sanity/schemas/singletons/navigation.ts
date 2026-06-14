import { defineType, defineField } from 'sanity'

export const navigationSchema = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Navigation Items',
      type: 'array',
      of: [{
        type: 'object',
        name: 'navItem',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string', validation: (r) => r.required() }),
          defineField({ name: 'url', title: 'URL', type: 'string' }),
          defineField({ name: 'openInNewTab', title: 'Open in new tab', type: 'boolean', initialValue: false }),
          defineField({
            name: 'children',
            title: 'Dropdown Items',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                defineField({ name: 'label', title: 'Label', type: 'string', validation: (r) => r.required() }),
                defineField({ name: 'url', title: 'URL', type: 'string', validation: (r) => r.required() }),
                defineField({ name: 'description', title: 'Description', type: 'string' }),
                defineField({ name: 'openInNewTab', title: 'Open in new tab', type: 'boolean', initialValue: false }),
              ],
              preview: { select: { title: 'label', subtitle: 'url' } },
            }],
          }),
        ],
        preview: { select: { title: 'label', subtitle: 'url' } },
      }],
    }),
    defineField({
      name: 'ctaButton',
      title: 'CTA Button',
      type: 'link',
      description: 'Primary action button shown in the nav (e.g. "Apply Now")',
    }),
    defineField({
      name: 'admissionsButton',
      title: 'Admissions Portal Button',
      type: 'link',
      description: 'Secondary button linking to the external admissions portal',
    }),
  ],
  preview: { prepare: () => ({ title: 'Navigation' }) },
})
