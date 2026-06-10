import { defineType, defineField } from 'sanity'

export const homepageFeatureSchema = defineType({
  name: 'homepageFeature',
  title: 'Homepage Feature',
  type: 'document',
  fields: [
    defineField({ name: 'section',     title: 'Section',     type: 'string',
      options: { list: ['why_choose', 'journey'] }, validation: r => r.required() }),
    defineField({ name: 'title',       title: 'Title',       type: 'string',  validation: r => r.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text',    validation: r => r.required() }),
    defineField({ name: 'iconName',    title: 'Icon Name',   type: 'string',  description: 'Lucide icon name, e.g. BookOpen' }),
    defineField({ name: 'sortOrder',   title: 'Sort Order',  type: 'number',  initialValue: 0 }),
    defineField({ name: 'isActive',    title: 'Active',      type: 'boolean', initialValue: true }),
  ],
})
