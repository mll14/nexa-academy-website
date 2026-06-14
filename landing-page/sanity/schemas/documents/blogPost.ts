import { defineType, defineField } from 'sanity'
import { DocumentIcon } from '@sanity/icons'

const CATEGORIES = [
  { title: 'Tutorial', value: 'tutorial' },
  { title: 'Career Advice', value: 'career' },
  { title: 'Tech & Industry', value: 'tech' },
  { title: 'Student Life', value: 'student-life' },
  { title: 'News & Updates', value: 'news' },
  { title: 'Course Content', value: 'course-content' },
]

export const blogPostSchema = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'meta', title: 'Meta' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: { list: CATEGORIES, layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'meta',
      to: [{ type: 'teamMember' }],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'meta',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Post',
      type: 'boolean',
      group: 'meta',
      initialValue: false,
      description: 'Featured posts appear prominently on the blog index.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: 'readingTime',
      title: 'Reading Time (minutes)',
      type: 'number',
      group: 'meta',
      description: 'Leave blank to auto-estimate on the frontend.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blogBody',
      group: 'content',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'meta',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Related Posts',
      type: 'array',
      group: 'meta',
      of: [{ type: 'reference', to: [{ type: 'blogPost' }] }],
      validation: (r) => r.max(3),
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'category', media: 'coverImage', featured: 'featured' },
    prepare({ title, subtitle, media, featured }) {
      return {
        title: `${featured ? '⭐ ' : ''}${title}`,
        subtitle,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Published (newest)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
})
