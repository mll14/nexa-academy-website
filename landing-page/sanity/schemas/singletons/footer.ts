import { defineType, defineField } from 'sanity'

export const footerSchema = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  fields: [
    defineField({ name: 'tagline', title: 'Tagline', type: 'string' }),
    defineField({ name: 'copyrightText', title: 'Copyright Text', type: 'string',
      description: 'Use {year} as a placeholder for the current year. E.g. "© {year} Nexa Academy"' }),
    defineField({
      name: 'columns',
      title: 'Footer Columns',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'heading', title: 'Column Heading', type: 'string', validation: (r) => r.required() }),
          defineField({
            name: 'links',
            title: 'Links',
            type: 'array',
            of: [{ type: 'link' }],
          }),
        ],
        preview: { select: { title: 'heading' } },
      }],
    }),
    defineField({
      name: 'bottomLinks',
      title: 'Bottom Bar Links',
      type: 'array',
      description: 'Links shown in the footer bottom bar (Privacy Policy, Terms, etc.)',
      of: [{ type: 'link' }],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'platform', title: 'Platform', type: 'string',
            options: { list: [
              { title: 'Twitter / X', value: 'twitter' },
              { title: 'LinkedIn', value: 'linkedin' },
              { title: 'Facebook', value: 'facebook' },
              { title: 'Instagram', value: 'instagram' },
              { title: 'YouTube', value: 'youtube' },
              { title: 'GitHub', value: 'github' },
              { title: 'TikTok', value: 'tiktok' },
            ] },
          }),
          defineField({ name: 'url', title: 'URL', type: 'url' }),
        ],
        preview: { select: { title: 'platform', subtitle: 'url' } },
      }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Footer' }) },
})
