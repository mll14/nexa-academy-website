import { defineType, defineField } from 'sanity'

const base = [
  defineField({ name: 'sectionId', type: 'string', title: 'Section ID (anchor)' }),
  defineField({ name: 'isHidden', type: 'boolean', title: 'Hide this section', initialValue: false }),
  defineField({ name: 'background', type: 'sectionBackground', title: 'Background' }),
]

export const programsSectionSchema = defineType({
  name: 'programsSection', title: 'Programs', type: 'object',
  fields: [
    ...base,
    defineField({ name: 'badge', type: 'string', title: 'Badge' }),
    defineField({ name: 'sectionTitle', type: 'string', title: 'Title' }),
    defineField({ name: 'sectionSubtitle', type: 'string', title: 'Subtitle' }),
    defineField({ name: 'ctaTitle', type: 'string', title: 'CTA Heading', description: 'Bottom CTA heading, e.g. "Not sure which program is right for you?"' }),
    defineField({ name: 'ctaDescription', type: 'string', title: 'CTA Description', description: 'Short subtext shown under the CTA heading' }),
    defineField({ name: 'layout', type: 'string', title: 'Layout',
      options: { list: ['cards', 'list'], layout: 'radio' }, initialValue: 'cards' }),
    defineField({ name: 'ctaLabel', type: 'string', title: 'CTA button label', initialValue: 'Apply Now' }),
    defineField({ name: 'ctaUrl', type: 'string', title: 'CTA URL override',
      description: 'Use {slug} as placeholder. Leave blank to use the default admissions URL.' }),
  ],
  preview: { prepare: () => ({ title: 'Programs (API)' }) },
})
