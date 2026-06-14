import { defineType, defineField } from 'sanity'

// Stub — careers section planned for a future release.
export const careerSchema = defineType({
  name: 'career',
  title: 'Career Opening',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Job Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug',
      options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({
      name: 'department', title: 'Department', type: 'string',
      options: { list: [
        { title: 'Engineering', value: 'engineering' },
        { title: 'Instruction', value: 'instruction' },
        { title: 'Admissions', value: 'admissions' },
        { title: 'Marketing', value: 'marketing' },
        { title: 'Operations', value: 'operations' },
      ] },
    }),
    defineField({ name: 'employmentType', title: 'Employment Type', type: 'string',
      options: { list: [
        { title: 'Full-time', value: 'full-time' },
        { title: 'Part-time', value: 'part-time' },
        { title: 'Contract', value: 'contract' },
        { title: 'Internship', value: 'internship' },
      ] },
    }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({ name: 'description', title: 'Job Description', type: 'blockContent' }),
    defineField({ name: 'applicationUrl', title: 'Application URL', type: 'url' }),
    defineField({ name: 'isActive', title: 'Actively Hiring', type: 'boolean', initialValue: true }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'datetime' }),
  ],
  preview: { select: { title: 'title', subtitle: 'department' } },
})
