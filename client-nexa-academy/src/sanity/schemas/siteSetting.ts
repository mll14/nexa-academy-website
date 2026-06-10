import { defineType, defineField } from 'sanity'

export const siteSettingSchema = defineType({
  name: 'siteSetting',
  title: 'Site Setting',
  type: 'document',
  fields: [
    defineField({ name: 'key',   title: 'Key',   type: 'string', validation: r => r.required(), description: 'Unique key, e.g. hero_title' }),
    defineField({ name: 'value', title: 'Value', type: 'text',   validation: r => r.required() }),
    defineField({ name: 'group', title: 'Group', type: 'string', description: 'hero, contact, cta' }),
    defineField({ name: 'label', title: 'Label', type: 'string', description: 'Human-readable description' }),
  ],
})
