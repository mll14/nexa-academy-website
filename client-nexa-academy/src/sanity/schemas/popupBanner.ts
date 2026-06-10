import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'popupBanner',
  title: 'Pop-up Banner',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Banner Name',
      type: 'string',
      description: 'Internal name — not shown to visitors. E.g. "June intake promo"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      title: 'Message',
      type: 'text',
      rows: 3,
      description: 'The message visitors will see in the banner',
    }),
    defineField({
      name: 'ctaText',
      title: 'Button Text',
      type: 'string',
      description: 'Leave blank to show no button. E.g. "Apply Now"',
    }),
    defineField({
      name: 'ctaUrl',
      title: 'Button Link',
      type: 'url',
      description: 'Where the button should go. E.g. https://nexaacademy.co.ke/apply',
      validation: (r) =>
        r.uri({ allowRelative: true }).warning('Use a full URL or a /path starting with /'),
    }),
    defineField({
      name: 'isActive',
      title: 'Show this banner',
      type: 'boolean',
      description: 'Turn off to hide the banner without deleting it',
      initialValue: false,
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'datetime',
      description: 'When to start showing (leave blank = show immediately when active)',
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'datetime',
      description: 'When to stop showing (leave blank = show indefinitely)',
    }),
    defineField({
      name: 'targetPage',
      title: 'Show On',
      type: 'string',
      description: 'Which pages should display this banner',
      options: {
        list: [
          { title: 'All Pages', value: 'all' },
          { title: 'Home Page Only', value: 'home' },
          { title: 'Programs Page', value: 'programs' },
          { title: 'Blog', value: 'blog' },
        ],
        layout: 'radio',
      },
      initialValue: 'all',
    }),
    defineField({
      name: 'dismissible',
      title: 'Visitors can close this banner',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'number',
      description: 'Higher number = shown first when multiple banners are active',
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: 'title', isActive: 'isActive' },
    prepare({ title, isActive }: { title: string; isActive: boolean }) {
      return { title, subtitle: isActive ? 'Active' : 'Inactive' }
    },
  },
})
