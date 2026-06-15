import { defineType, defineField, defineArrayMember } from 'sanity'

const salaryRangeObject = defineArrayMember({
  type: 'object',
  name: 'salaryRange',
  fields: [
    defineField({ name: 'stage', title: 'Career Stage', type: 'string' }),
    defineField({ name: 'kenyaRange', title: 'Kenya Range', type: 'string' }),
    defineField({ name: 'globalRange', title: 'Global Range', type: 'string' }),
  ],
  preview: { select: { title: 'stage', subtitle: 'kenyaRange' } },
})

const faqItemObject = defineArrayMember({
  type: 'object',
  name: 'faqItem',
  fields: [
    defineField({ name: 'question', title: 'Question', type: 'string' }),
    defineField({ name: 'answer', title: 'Answer', type: 'blockContent' }),
  ],
  preview: { select: { title: 'question' } },
})

const courseModuleObject = defineArrayMember({
  type: 'object',
  name: 'courseModule',
  fields: [
    defineField({ name: 'title', title: 'Module Title', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'blockContent' }),
    defineField({ name: 'isBonus', title: 'Bonus Module?', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'title', subtitle: 'isBonus' } },
})

const impactMetricObject = defineArrayMember({
  type: 'object',
  name: 'impactMetric',
  fields: [
    defineField({ name: 'value', title: 'Value (e.g. 95%)', type: 'string' }),
    defineField({ name: 'label', title: 'Label', type: 'string' }),
    defineField({ name: 'description', title: 'Description (supporting text)', type: 'string' }),
  ],
  preview: { select: { title: 'value', subtitle: 'label' } },
})

const differentiatorObject = defineArrayMember({
  type: 'object',
  name: 'differentiator',
  fields: [
    defineField({ name: 'number', title: 'Number', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'number', subtitle: 'title' } },
})

const paymentPlanObject = defineArrayMember({
  type: 'object',
  name: 'paymentPlan',
  fields: [
    defineField({ name: 'title', title: 'Plan Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'string' }),
    defineField({ name: 'badge', title: 'Badge (e.g. "Best Value")', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'description' } },
})

export const programSchema = defineType({
  name: 'program',
  title: 'Program',
  type: 'document',
  fields: [
    // Identity (mirrors Django slug — must stay in sync)
    defineField({ name: 'name', title: 'Course Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'programName', title: 'Program Name (legacy)', type: 'string', hidden: true }),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'price', title: 'Price (KSh)', type: 'number' }),
    defineField({ name: 'originalPrice', title: 'Original Price (KSh)', type: 'number' }),

    // Program metadata
    defineField({
      name: 'level', title: 'Level', type: 'string',
      options: { list: ['Beginner', 'Intermediate', 'Advanced'] },
    }),
    defineField({ name: 'durationMonths', title: 'Duration (months)', type: 'number' }),
    defineField({ name: 'comingSoon', title: 'Coming Soon?', type: 'boolean', initialValue: false }),
    defineField({ name: 'isActive', title: 'Active?', type: 'boolean', initialValue: true }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first on the programs page, footer, and homepage section. Leave blank to fall back to alphabetical.',
      initialValue: 99,
    }),

    // Learning outcomes
    defineField({
      name: 'outcomes', title: 'Learning Outcomes', type: 'array',
      of: [{ type: 'string' }],
    }),

    // Legacy FAQ array — hidden, use faqItems for new entries
    defineField({
      name: 'faq', title: 'FAQ (legacy)', type: 'array',
      of: [faqItemObject],
      hidden: true,
    }),

    // Hero
    defineField({ name: 'heroSubtitle', title: 'Hero Tagline', type: 'text', rows: 2 }),
    defineField({ name: 'heroImage', title: 'Hero Image', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })] }),
    defineField({ name: 'heroIcon', title: 'Course Icon', type: 'image' }),
    defineField({ name: 'syllabusUrl', title: 'Syllabus PDF URL', type: 'url' }),

    // Overview
    defineField({ name: 'overviewTitle', title: 'Overview Title', type: 'string' }),
    defineField({ name: 'overviewSubtitle', title: 'Overview Subtitle', type: 'text', rows: 2 }),
    defineField({ name: 'overviewBody', title: 'Overview Body', type: 'array', of: [{ type: 'block' }], hidden: true }),
    defineField({
      name: 'salaryRanges', title: 'Salary Ranges', type: 'array',
      of: [salaryRangeObject],
      hidden: true,
    }),
    defineField({ name: 'faqItems', title: 'Overview Dropdowns', description: 'Accordion items shown under the overview section', type: 'array', of: [faqItemObject] }),

    // Curriculum
    defineField({ name: 'curriculumTitle', title: 'Curriculum Section Title', type: 'string' }),
    defineField({ name: 'curriculumSubtitle', title: 'Curriculum Subtitle', type: 'text', rows: 2 }),
    defineField({ name: 'modules', title: 'Course Modules', type: 'array', of: [courseModuleObject] }),

    // Impact Metrics
    defineField({ name: 'impactLabel', title: 'Impact Label (e.g. IMPACT)', type: 'string' }),
    defineField({ name: 'impactTitle', title: 'Impact Section Title', type: 'string' }),
    defineField({ name: 'impactSubtitle', title: 'Impact Section Subtitle', type: 'text', rows: 2 }),
    defineField({ name: 'impactMetrics', title: 'Impact Metrics', type: 'array', of: [impactMetricObject] }),

    // Testimonials
    defineField({ name: 'testimonialsHidden', title: 'Hide Testimonials Section', type: 'boolean', initialValue: false }),
    defineField({ name: 'testimonialsTitle', title: 'Testimonials Title', type: 'string' }),
    defineField({ name: 'testimonialsSubtitle', title: 'Testimonials Subtitle', type: 'text', rows: 2 }),
    defineField({
      name: 'testimonials', title: 'Testimonials', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'testimonial' }] }],
    }),

    // Differentiators
    defineField({ name: 'differentiatorTitle', title: 'Why This Course Title', type: 'string' }),
    defineField({ name: 'differentiators', title: 'Differentiator Cards', type: 'array', of: [differentiatorObject] }),

    // CTA
    defineField({ name: 'ctaTitle', title: 'CTA Title', type: 'string' }),
    defineField({ name: 'ctaSubtitle', title: 'CTA Subtitle', type: 'text', rows: 2 }),
    defineField({ name: 'ctaButtonText', title: 'CTA Button Text', type: 'string', initialValue: 'Apply Now' }),

    // Pricing & payment
    defineField({
      name: 'paymentNote',
      title: 'Payment Note',
      type: 'string',
      description: 'Short note shown below the price (e.g. "Flexible installments available").',
      initialValue: 'Installment plans available — 2-payment split on checkout',
    }),
    defineField({
      name: 'paymentPlans',
      title: 'Payment Plans',
      description: 'List of payment options shown in the CTA card (e.g. Full Payment, 2 Installments, Monthly Plan).',
      type: 'array',
      of: [paymentPlanObject],
    }),
    defineField({
      name: 'includedItems',
      title: 'What\'s Included',
      description: 'Bullet points shown at the bottom of the CTA card.',
      type: 'array',
      of: [{ type: 'string' }],
    }),

    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }, { field: 'name', direction: 'asc' }],
    },
    {
      title: 'Name A–Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'order', media: 'heroImage' },
    prepare({ title, subtitle, media }: { title: string; subtitle?: number; media: any }) {
      return {
        title,
        subtitle: subtitle != null ? `Order: ${subtitle}` : 'No order set',
        media,
      }
    },
  },
})
