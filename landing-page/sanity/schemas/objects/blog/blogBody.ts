import { defineType, defineArrayMember, defineField } from 'sanity'

export const blogBodySchema = defineType({
  name: 'blogBody',
  title: 'Blog Body',
  type: 'array',
  of: [
    // ── Standard rich text ─────────────────────────────────────────────────────
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
          { title: 'Code', value: 'code' },
          { title: 'Strike', value: 'strike-through' },
        ],
        annotations: [
          {
            type: 'object',
            name: 'link',
            title: 'Link',
            fields: [
              defineField({ name: 'href', type: 'string', title: 'URL', validation: (r) => r.required() }),
              defineField({ name: 'blank', type: 'boolean', title: 'Open in new tab', initialValue: true }),
            ],
          },
        ],
      },
    }),

    // ── Inline image ───────────────────────────────────────────────────────────
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text', validation: (r) => r.required() }),
        defineField({ name: 'caption', type: 'string', title: 'Caption' }),
      ],
    }),

    // ── Custom content blocks ──────────────────────────────────────────────────
    defineArrayMember({ type: 'codeBlock' }),
    defineArrayMember({ type: 'mathBlock' }),
    defineArrayMember({ type: 'videoEmbed' }),
    defineArrayMember({ type: 'downloadableResource' }),
    defineArrayMember({ type: 'learningObjectives' }),
    defineArrayMember({ type: 'instructorNote' }),
    defineArrayMember({ type: 'blogCta' }),
    defineArrayMember({ type: 'quizBlock' }),
    defineArrayMember({ type: 'notebookEmbed' }),
  ],
})
