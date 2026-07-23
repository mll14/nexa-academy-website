import { defineType, defineField } from 'sanity'

export const blogIndexPageSchema = defineType({
  name: 'blogIndexPage',
  title: 'Blog Page',
  type: 'document',
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'listing', title: 'Listing' },
    { name: 'empty', title: 'Empty State' },
    { name: 'post', title: 'Post Page' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      initialValue: 'Blog Page',
      description: 'For Studio reference only — not shown on the site.',
      group: 'header',
    }),

    // --- Header ---
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small uppercase label above the headline.',
      initialValue: 'Blog',
      group: 'header',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      initialValue: 'Insights & Tutorials',
      group: 'header',
    }),
    defineField({
      name: 'intro',
      title: 'Intro Paragraph',
      type: 'text',
      rows: 3,
      initialValue: 'Deep dives, career guides, and stories from our instructors and students.',
      group: 'header',
    }),

    // --- Listing ---
    defineField({
      name: 'showFeatured',
      title: 'Show a featured post',
      type: 'boolean',
      description:
        'When on, the newest post marked "Featured" (or the most recent post) is shown in a large card above the grid.',
      initialValue: true,
      group: 'listing',
    }),
    defineField({
      name: 'moreArticlesHeading',
      title: 'Grid Heading (with featured post)',
      type: 'string',
      initialValue: 'More Articles',
      group: 'listing',
    }),
    defineField({
      name: 'allArticlesHeading',
      title: 'Grid Heading (no featured post)',
      type: 'string',
      initialValue: 'All Articles',
      group: 'listing',
    }),
    defineField({
      name: 'emptyCategoryText',
      title: 'Empty Category Message',
      type: 'string',
      description: 'Shown when a category filter matches no posts.',
      initialValue: 'No posts in this category yet.',
      group: 'listing',
    }),

    // --- Empty state ---
    defineField({
      name: 'emptyStateText',
      title: 'Empty State Message',
      type: 'string',
      description: 'Shown when no posts are published yet.',
      initialValue: 'No posts published yet. Check back soon!',
      group: 'empty',
    }),
    defineField({
      name: 'emptyStateCta',
      title: 'Empty State Link',
      type: 'link',
      group: 'empty',
    }),

    // --- Post detail page ---
    defineField({
      name: 'backLabel',
      title: 'Back Link Label',
      type: 'string',
      initialValue: 'Back to Blog',
      group: 'post',
    }),
    defineField({
      name: 'relatedHeading',
      title: 'Related Posts Heading',
      type: 'string',
      initialValue: 'Related Articles',
      group: 'post',
    }),

    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Blog Page' }) },
})
