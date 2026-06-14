import { defineType, defineField } from 'sanity'
import { CodeBlockIcon } from '@sanity/icons'

const LANGUAGES = [
  { title: 'JavaScript', value: 'javascript' },
  { title: 'TypeScript', value: 'typescript' },
  { title: 'Python', value: 'python' },
  { title: 'Bash / Shell', value: 'bash' },
  { title: 'HTML', value: 'html' },
  { title: 'CSS', value: 'css' },
  { title: 'JSON', value: 'json' },
  { title: 'SQL', value: 'sql' },
  { title: 'YAML', value: 'yaml' },
  { title: 'Markdown', value: 'markdown' },
  { title: 'Go', value: 'go' },
  { title: 'Rust', value: 'rust' },
  { title: 'Java', value: 'java' },
  { title: 'C', value: 'c' },
  { title: 'C++', value: 'cpp' },
  { title: 'PHP', value: 'php' },
  { title: 'Ruby', value: 'ruby' },
  { title: 'Swift', value: 'swift' },
  { title: 'Kotlin', value: 'kotlin' },
  { title: 'R', value: 'r' },
  { title: 'TOML', value: 'toml' },
  { title: 'Dockerfile', value: 'docker' },
]

export const codeBlockSchema = defineType({
  name: 'codeBlock',
  title: 'Code Block',
  type: 'object',
  icon: CodeBlockIcon,
  fields: [
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: { list: LANGUAGES },
      initialValue: 'javascript',
    }),
    defineField({
      name: 'filename',
      title: 'Filename (optional)',
      type: 'string',
      placeholder: 'e.g. server.py',
    }),
    defineField({
      name: 'code',
      title: 'Code',
      type: 'text',
      rows: 12,
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { filename: 'filename', language: 'language', code: 'code' },
    prepare({ filename, language, code }) {
      return {
        title: filename || 'Code Block',
        subtitle: [language, code ? code.slice(0, 60) + '…' : ''].filter(Boolean).join(' — '),
      }
    },
  },
})
