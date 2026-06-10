import { defineType, defineField } from 'sanity'

export const blogPostSchema = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description: 'Auto-generated from title — used in the URL',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      description: 'Short summary shown in blog listings (max 160 characters)',
      validation: (r) => r.max(160),
    }),
    defineField({
      name: 'coverImageUrl',
      title: 'Cover Image URL',
      type: 'url',
      description: 'URL of the header image for this post',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description: 'Full name of the post author',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish Date',
      type: 'datetime',
      description: 'When this post should be considered published',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'News', value: 'news' },
          { title: 'Tutorial', value: 'tutorial' },
          { title: 'Career', value: 'career' },
          { title: 'Student Story', value: 'student_story' },
          { title: 'Announcement', value: 'announcement' },
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Optional tags for filtering',
    }),
    defineField({
      name: 'featured',
      title: 'Featured Post',
      type: 'boolean',
      description: 'Show this post prominently on the blog page',
      initialValue: false,
    }),
    defineField({
      name: 'body',
      title: 'Body (HTML)',
      type: 'text',
      description: 'Paste HTML content — sent directly to Django.',
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'title', isPublished: 'isPublished', featured: 'featured' },
    prepare({ title, isPublished, featured }: { title: string; isPublished: boolean; featured: boolean }) {
      const tags = [isPublished ? 'Published' : 'Draft', featured ? 'Featured' : '']
        .filter(Boolean)
        .join(' · ')
      return { title, subtitle: tags }
    },
  },
})
