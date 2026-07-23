import { defineType, defineField } from 'sanity'

export const eventsIndexPageSchema = defineType({
  name: 'eventsIndexPage',
  title: 'Events Page',
  type: 'document',
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'listing', title: 'Listing' },
    { name: 'empty', title: 'Empty State' },
    { name: 'event', title: 'Event Page' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      initialValue: 'Events Page',
      description: 'For Studio reference only — not shown on the site.',
      group: 'header',
    }),

    // --- Header ---
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small uppercase label above the headline.',
      initialValue: 'Events',
      group: 'header',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      initialValue: 'Open days, workshops & demo nights',
      group: 'header',
    }),
    defineField({
      name: 'intro',
      title: 'Intro Paragraph',
      type: 'text',
      rows: 3,
      initialValue:
        'Come meet the team, see student projects, and get a feel for how we teach — in person at our Nairobi campus or online.',
      group: 'header',
    }),

    // --- Listing ---
    defineField({
      name: 'upcomingHeading',
      title: 'Upcoming Section Heading',
      type: 'string',
      initialValue: 'Upcoming',
      group: 'listing',
    }),
    defineField({
      name: 'pastHeading',
      title: 'Past Section Heading',
      type: 'string',
      initialValue: 'Past events',
      group: 'listing',
    }),
    defineField({
      name: 'showPastEvents',
      title: 'Show past events',
      type: 'boolean',
      description: 'Turn off to hide the "Past events" section entirely.',
      initialValue: true,
      group: 'listing',
    }),

    // --- Empty state ---
    defineField({
      name: 'emptyStateText',
      title: 'Empty State Message',
      type: 'text',
      rows: 2,
      description: 'Shown when no events are scheduled.',
      initialValue:
        "No events scheduled right now. Check back soon — or book a visit and we'll show you around.",
      group: 'empty',
    }),
    defineField({
      name: 'emptyStatePrimaryCta',
      title: 'Empty State Primary Button',
      type: 'link',
      group: 'empty',
    }),
    defineField({
      name: 'emptyStateSecondaryCta',
      title: 'Empty State Secondary Button',
      type: 'link',
      group: 'empty',
    }),

    // --- Event detail page ---
    defineField({
      name: 'backLabel',
      title: 'Back Link Label',
      type: 'string',
      initialValue: 'All events',
      group: 'event',
    }),
    defineField({
      name: 'pastBadgeLabel',
      title: 'Past Event Badge',
      type: 'string',
      initialValue: 'Past event',
      group: 'event',
    }),
    defineField({
      name: 'registerLabel',
      title: 'Register Button Label',
      type: 'string',
      description: 'Links to each event’s own registration URL.',
      initialValue: 'Register',
      group: 'event',
    }),
    defineField({
      name: 'detailSecondaryCta',
      title: 'Secondary Button',
      type: 'link',
      description: 'Shown alongside Register on upcoming events.',
      group: 'event',
    }),

    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Events Page' }) },
})
