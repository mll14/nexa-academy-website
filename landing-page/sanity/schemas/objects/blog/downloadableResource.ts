import { defineType, defineField } from 'sanity'
import { DownloadIcon } from '@sanity/icons'

export const downloadableResourceSchema = defineType({
  name: 'downloadableResource',
  title: 'Downloadable Resource',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'fileType',
      title: 'File Type Label',
      type: 'string',
      placeholder: 'PDF, XLSX, ZIP…',
    }),
  ],
  preview: {
    select: { title: 'title', fileType: 'fileType' },
    prepare({ title, fileType }) {
      return { title: title || 'Download', subtitle: fileType }
    },
  },
})
