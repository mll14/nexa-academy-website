import { defineType, defineField, defineArrayMember } from 'sanity'

export const pageSchema = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Page Title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug', title: 'URL Slug', type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
    defineField({
      name: 'sections',
      title: 'Page Sections',
      description: 'Drag to reorder. Toggle "Hide this section" to disable without deleting.',
      type: 'array',
      of: [
        defineArrayMember({ type: 'heroSection' }),
        defineArrayMember({ type: 'statsSection' }),
        defineArrayMember({ type: 'featuresSection' }),
        defineArrayMember({ type: 'testimonialsSection' }),
        defineArrayMember({ type: 'faqSection' }),
        defineArrayMember({ type: 'ctaSection' }),
        defineArrayMember({ type: 'partnersSection' }),
        defineArrayMember({ type: 'programsSection' }),
        defineArrayMember({ type: 'pricingSection' }),
        defineArrayMember({ type: 'richTextSection' }),
        defineArrayMember({ type: 'imageTextSection' }),
        defineArrayMember({ type: 'contactSection' }),
        defineArrayMember({ type: 'teamSection' }),
        defineArrayMember({ type: 'videoSection' }),
        defineArrayMember({ type: 'financeCalculatorSection' }),
        defineArrayMember({ type: 'applicationSection' }),
        defineArrayMember({ type: 'legalSection' }),
      ],
    }),
    defineField({ name: 'publishedAt', title: 'Publish Date', type: 'datetime',
      description: 'Leave empty to keep as draft.' }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: slug ? `/${slug}` : 'No slug' }),
  },
})
