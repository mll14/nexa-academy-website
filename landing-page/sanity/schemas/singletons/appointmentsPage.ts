import { defineType, defineField } from 'sanity'

export const appointmentsPageSchema = defineType({
  name: 'appointmentsPage',
  title: 'Appointments Page',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'benefits', title: 'Benefits Section' },
    { name: 'cta', title: 'CTA Strip' },
    { name: 'form', title: 'Form & Sidebar' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Internal Title', initialValue: 'Appointments Page' }),

    // Hero
    defineField({ name: 'badge', type: 'string', title: 'Hero Badge', initialValue: 'Book a Visit', group: 'hero' }),
    defineField({ name: 'headline', type: 'string', title: 'Hero Headline', initialValue: 'Meet the Nexa Team', group: 'hero' }),
    defineField({
      name: 'subheadline', type: 'text', title: 'Hero Subheadline', rows: 3,
      initialValue: 'Whether you want to learn more about our programs, get a feel for the space, or speak to a mentor — book a quick chat with us.',
      group: 'hero',
    }),
    defineField({
      name: 'heroCtaPrimary', title: 'Primary CTA', type: 'object', group: 'hero',
      fields: [
        defineField({ name: 'label', type: 'string', title: 'Label', initialValue: 'Book an Appointment' }),
        defineField({ name: 'url', type: 'string', title: 'URL / anchor', initialValue: '#book-form' }),
      ],
    }),
    defineField({
      name: 'heroCtaSecondary', title: 'Secondary CTA', type: 'object', group: 'hero',
      fields: [
        defineField({ name: 'label', type: 'string', title: 'Label', initialValue: 'Browse Programs' }),
        defineField({ name: 'url', type: 'string', title: 'URL / anchor', initialValue: '/programs' }),
      ],
    }),

    // Benefits
    defineField({ name: 'benefitsBadge', type: 'string', title: 'Badge', initialValue: 'Why Visit Us', group: 'benefits' }),
    defineField({ name: 'benefitsHeadline', type: 'string', title: 'Headline', initialValue: 'What to expect from your visit', group: 'benefits' }),
    defineField({ name: 'benefitsSubheadline', type: 'text', title: 'Subheadline', rows: 2, group: 'benefits' }),
    defineField({
      name: 'benefits', title: 'Benefits', type: 'array', group: 'benefits',
      of: [{
        type: 'object', name: 'benefit',
        fields: [
          defineField({ name: 'icon', type: 'string', title: 'Icon (lucide name)', description: 'e.g. Users, Video, MapPin, Star, MessageCircle, Zap' }),
          defineField({ name: 'title', type: 'string', title: 'Title' }),
          defineField({ name: 'description', type: 'text', title: 'Description', rows: 2 }),
        ],
        preview: { select: { title: 'title' } },
      }],
    }),

    // CTA Strip
    defineField({ name: 'ctaHeadline', type: 'string', title: 'Headline', initialValue: 'Ready to take the next step?', group: 'cta' }),
    defineField({ name: 'ctaSubheadline', type: 'text', title: 'Subheadline', rows: 2, group: 'cta' }),
    defineField({ name: 'ctaButtonLabel', type: 'string', title: 'Button Label', initialValue: 'Book an Appointment', group: 'cta' }),

    // Form & Sidebar
    defineField({ name: 'formBadge', type: 'string', title: 'Form Badge', initialValue: 'Schedule a Visit', group: 'form' }),
    defineField({ name: 'formHeadline', type: 'string', title: 'Form Headline', initialValue: 'Book Your Appointment', group: 'form' }),
    defineField({
      name: 'formSubheadline', type: 'text', title: 'Form Subheadline', rows: 2,
      initialValue: 'Fill in the details below to schedule a virtual or in-person meeting with our team.',
      group: 'form',
    }),
    defineField({
      name: 'features', title: 'Why Book (Sidebar)', type: 'array', group: 'form',
      of: [{
        type: 'object', name: 'feature',
        fields: [
          defineField({ name: 'title', type: 'string', title: 'Title' }),
          defineField({ name: 'description', type: 'string', title: 'Description' }),
        ],
        preview: { select: { title: 'title' } },
      }],
    }),
    defineField({ name: 'nextSteps', title: 'Next Steps (Sidebar)', type: 'array', group: 'form', of: [{ type: 'string' }] }),
    defineField({ name: 'officeAddress', type: 'string', title: 'Office Address', initialValue: '10th Floor, JKUAT Towers, CBD Nairobi', group: 'form' }),
    defineField({ name: 'officeMapUrl', type: 'url', title: 'Google Maps URL', group: 'form' }),

    defineField({ name: 'seo', type: 'seo', title: 'SEO', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Appointments Page' }) },
})
