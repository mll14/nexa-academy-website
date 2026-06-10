import { defineType, defineField } from 'sanity'

export const legalDocumentSchema = defineType({
  name: 'legalDocument',
  title: 'Legal Document Section',
  type: 'document',
  fields: [
    defineField({ name: 'docType',   title: 'Document Type', type: 'string',
      options: { list: ['privacy', 'terms'] }, validation: r => r.required() }),
    defineField({ name: 'sectionId', title: 'Section ID',    type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'title',     title: 'Title',         type: 'string',  validation: r => r.required() }),
    defineField({ name: 'content',   title: 'Content',       type: 'text',    validation: r => r.required() }),
    defineField({ name: 'sortOrder', title: 'Sort Order',    type: 'number',  initialValue: 0 }),
    defineField({ name: 'isActive',  title: 'Active',        type: 'boolean', initialValue: true }),
  ],
})
