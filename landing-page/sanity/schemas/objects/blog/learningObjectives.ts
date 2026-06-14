import { defineType, defineField } from 'sanity'
import { CheckmarkIcon } from '@sanity/icons'

export const learningObjectivesSchema = defineType({
  name: 'learningObjectives',
  title: 'Learning Objectives',
  type: 'object',
  icon: CheckmarkIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: "What You'll Learn",
    }),
    defineField({
      name: 'objectives',
      title: 'Objectives',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'title', objectives: 'objectives' },
    prepare({ title, objectives }) {
      return {
        title: title || 'Learning Objectives',
        subtitle: `${(objectives ?? []).length} objectives`,
      }
    },
  },
})
