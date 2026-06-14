import { defineType, defineField } from 'sanity'

export const siteSettingsSchema = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'branding',     title: 'Branding' },
    { name: 'contact',      title: 'Contact' },
    { name: 'contactPage',  title: 'Contact Page Content' },
    { name: 'applyPage',    title: 'Apply Page Content' },
    { name: 'seo',          title: 'Default SEO' },
    { name: 'social',       title: 'Social Links' },
    { name: 'announcement', title: 'Announcement Bar' },
  ],
  fields: [
    defineField({ name: 'siteName', title: 'Site Name', type: 'string', group: 'branding',
      validation: (r) => r.required() }),
    defineField({ name: 'logo', title: 'Logo', type: 'image', group: 'branding',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'logoText', title: 'Logo Text (fallback)', type: 'string', group: 'branding' }),
    defineField({ name: 'favicon', title: 'Favicon', type: 'image', group: 'branding' }),

    defineField({ name: 'contactEmail', title: 'Contact Email', type: 'string', group: 'contact' }),
    defineField({ name: 'contactPhone', title: 'Contact Phone', type: 'string', group: 'contact' }),
    defineField({ name: 'address', title: 'Physical Address (short label)', type: 'string', group: 'contact' }),
    defineField({ name: 'locationUrl', title: 'Location Map URL', type: 'url', group: 'contact',
      description: 'Google Maps share link shown on the contact page' }),
    defineField({ name: 'mapEmbedUrl', title: 'Google Maps Embed URL', type: 'url', group: 'contact',
      description: 'Paste the src= value from Google Maps → Share → Embed a map' }),

    // ── Contact page content ──────────────────────────────────────────────────
    defineField({
      name: 'responseTimes', title: 'Expected Response Times', type: 'array', group: 'contactPage',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string', validation: r => r.required() }),
          defineField({ name: 'value', title: 'Value (e.g. "Under 2 hours")', type: 'string', validation: r => r.required() }),
        ],
        preview: { select: { title: 'label', subtitle: 'value' } },
      }],
    }),
    defineField({
      name: 'whyReach', title: '"Why Reach Out?" Items', type: 'array', group: 'contactPage',
      of: [{ type: 'string' }],
    }),

    // ── Apply page content ────────────────────────────────────────────────────
    defineField({
      name: 'admissionsTimeline', title: 'Admissions Timeline', type: 'array', group: 'applyPage',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Step label', type: 'string', validation: r => r.required() }),
          defineField({ name: 'value', title: 'Time / value', type: 'string', validation: r => r.required() }),
        ],
        preview: { select: { title: 'label', subtitle: 'value' } },
      }],
    }),
    defineField({
      name: 'whyNexa', title: '"Why Nexa?" Items', type: 'array', group: 'applyPage',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'nextSteps', title: 'Next Steps', type: 'array', group: 'applyPage',
      of: [{ type: 'string' }],
    }),

    defineField({ name: 'defaultSeo', title: 'Default SEO', type: 'seo', group: 'seo' }),

    defineField({
      name: 'socialLinks', title: 'Social Links', type: 'array', group: 'social',
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
            validation: (r) => r.required(),
          }),
          defineField({ name: 'url', title: 'URL', type: 'url', validation: (r) => r.required() }),
        ],
        preview: { select: { title: 'platform', subtitle: 'url' } },
      }],
    }),

    defineField({
      name: 'announcementBar', title: 'Announcement Bar', type: 'object', group: 'announcement',
      fields: [
        defineField({ name: 'isActive', title: 'Show Announcement Bar', type: 'boolean', initialValue: false }),
        defineField({ name: 'text', title: 'Announcement Text', type: 'string' }),
        defineField({ name: 'link', title: 'Link', type: 'link' }),
        defineField({ name: 'style', title: 'Style', type: 'string',
          options: { list: [
            { title: 'Info (blue)', value: 'info' },
            { title: 'Warning (yellow)', value: 'warning' },
            { title: 'Success (green)', value: 'success' },
            { title: 'Promo (purple)', value: 'promo' },
          ] },
          initialValue: 'info',
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
})
