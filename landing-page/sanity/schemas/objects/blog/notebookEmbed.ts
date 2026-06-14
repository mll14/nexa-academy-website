import { defineType, defineField } from 'sanity'

export const notebookEmbedSchema = defineType({
  name: 'notebookEmbed',
  title: 'Notebook Embed (Jupyter / Colab)',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({
      name: 'embedUrl',
      title: 'Embed URL',
      description: 'nbviewer, Google Colab, or any iframe-compatible notebook URL',
      type: 'url',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'height',
      title: 'Height (px)',
      type: 'number',
      initialValue: 600,
    }),
  ],
  preview: {
    select: { title: 'title', url: 'embedUrl' },
    prepare({ title, url }) {
      return { title: `📓 ${title ?? 'Notebook'}`, subtitle: url }
    },
  },
})
