import { defineType, defineField, defineArrayMember } from 'sanity'

const base = [
  defineField({ name: 'sectionId', title: 'Section ID (anchor)', type: 'string', initialValue: 'book-form' }),
  defineField({ name: 'isHidden', title: 'Hide this section', type: 'boolean', initialValue: false }),
  defineField({ name: 'background', title: 'Background', type: 'sectionBackground' }),
]

export const appointmentFormSectionSchema = defineType({
  name: 'appointmentFormSection',
  title: 'Appointment Booking Form',
  type: 'object',
  description: 'The 3-step booking wizard with sidebar. Include exactly one per appointments page.',
  fields: [
    defineField({ name: 'badge', title: 'Form Badge', type: 'string', initialValue: 'Schedule a Visit' }),
    defineField({ name: 'headline', title: 'Form Headline', type: 'string', initialValue: 'Book Your Appointment' }),
    defineField({
      name: 'subheadline',
      title: 'Form Subheadline',
      type: 'text',
      rows: 2,
      initialValue: 'Fill in the details below to schedule a virtual or in-person meeting with our team.',
    }),
    defineField({
      name: 'sidebarItems',
      title: 'Why Book? (Sidebar)',
      description: 'Numbered reasons shown in the sidebar next to the booking form.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sidebarItem',
          fields: [
            defineField({ name: 'title', type: 'string', title: 'Title', validation: (r) => r.required() }),
            defineField({ name: 'description', type: 'string', title: 'Description' }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
    }),
    defineField({
      name: 'nextSteps',
      title: 'What Happens Next? (Sidebar)',
      description: 'Numbered steps shown below the "Why Book" card.',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({ name: 'officeAddress', title: 'Office Address', type: 'string', initialValue: '10th Floor, JKUAT Towers, CBD Nairobi' }),
    defineField({ name: 'officeMapUrl', title: 'Google Maps URL', type: 'url' }),
    ...base,
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: `📅 Booking Form — ${title ?? 'Untitled'}` }),
  },
})
