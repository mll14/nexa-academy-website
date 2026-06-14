import { defineType, defineField, defineArrayMember } from 'sanity'

export const quizBlockSchema = defineType({
  name: 'quizBlock',
  title: 'Quiz / Knowledge Check',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'text',
      rows: 2,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'options',
      title: 'Answer Options',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'text',
              title: 'Answer text',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'isCorrect',
              title: 'Correct answer?',
              type: 'boolean',
              initialValue: false,
            }),
            defineField({
              name: 'explanation',
              title: 'Explanation (shown after selecting)',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: { text: 'text', isCorrect: 'isCorrect' },
            prepare({ text, isCorrect }) {
              return { title: `${isCorrect ? '✅' : '❌'} ${text}` }
            },
          },
        }),
      ],
      validation: (r) => r.required().min(2).max(6),
    }),
    defineField({
      name: 'explanation',
      title: 'Overall Explanation (shown after answering)',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: { question: 'question', options: 'options' },
    prepare({ question, options }) {
      return {
        title: `❓ ${question}`,
        subtitle: `${(options ?? []).length} options`,
      }
    },
  },
})
