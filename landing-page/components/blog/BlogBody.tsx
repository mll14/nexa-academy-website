import { PortableText, type PortableTextReactComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cn } from '@/lib/utils'
import { CodeBlock } from './blocks/CodeBlock'
import { MathBlock } from './blocks/MathBlock'
import { VideoEmbed } from './blocks/VideoEmbed'
import { LearningObjectives } from './blocks/LearningObjectives'
import { InstructorNote } from './blocks/InstructorNote'
import { BlogCta } from './blocks/BlogCta'
import { QuizBlock } from './blocks/QuizBlock'
import { DownloadableResource } from './blocks/DownloadableResource'
import { NotebookEmbed } from './blocks/NotebookEmbed'
import type { BlogBodyBlock } from '@/types'

function headingId(children: React.ReactNode): string {
  const text = typeof children === 'string' ? children
    : Array.isArray(children) ? children.map((c) => (typeof c === 'string' ? c : '')).join('') : ''
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const portableComponents: Partial<PortableTextReactComponents> = {
  types: {
    image: ({ value }: { value: { asset: unknown; alt?: string; caption?: string } }) => (
      <figure className="my-8">
        <div className="relative overflow-hidden rounded-xl border border-border">
          <Image
            src={urlFor(value).width(860).url()}
            alt={value.alt ?? ''}
            width={860}
            height={480}
            className="w-full object-cover"
          />
        </div>
        {value.caption && (
          <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
            {value.caption}
          </figcaption>
        )}
      </figure>
    ),
    // Custom blocks — delegated to dedicated components
    codeBlock: ({ value }) => <CodeBlock value={value} />,
    mathBlock: ({ value }) => <MathBlock value={value} />,
    videoEmbed: ({ value }) => <VideoEmbed value={value} />,
    learningObjectives: ({ value }) => <LearningObjectives value={value} />,
    instructorNote: ({ value }) => <InstructorNote value={value} />,
    blogCta: ({ value }) => <BlogCta value={value} />,
    quizBlock: ({ value }) => <QuizBlock value={value} />,
    downloadableResource: ({ value }) => <DownloadableResource value={value} />,
    notebookEmbed: ({ value }) => <NotebookEmbed value={value} />,
  },

  marks: {
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => <span className="underline underline-offset-2">{children}</span>,
    'strike-through': ({ children }) => <del className="opacity-60">{children}</del>,
    code: ({ children }) => (
      <code className="rounded-md bg-muted px-1.5 py-0.5 text-[0.8125rem] font-mono text-foreground border border-border">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      type LinkValue = { href?: string; blank?: boolean }
      const v = value as LinkValue | undefined
      const href = v?.href ?? '#'
      const isSafe = /^https?:\/\//i.test(href) || href.startsWith('/')
      if (!isSafe) return <span>{children}</span>
      return (
        <a
          href={href}
          target={v?.blank ? '_blank' : undefined}
          rel={v?.blank ? 'noopener noreferrer' : undefined}
          className="text-primary underline underline-offset-2 hover:opacity-75 transition-opacity"
        >
          {children}
        </a>
      )
    },
  },

  block: {
    h2: ({ children }) => {
      const id = headingId(children)
      return (
        <h2
          id={id}
          className="scroll-mt-24 text-xl font-bold text-foreground mt-10 mb-4 pb-2 border-b border-border [&:first-child]:mt-0"
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => {
      const id = headingId(children)
      return (
        <h3 id={id} className="scroll-mt-24 text-base font-semibold text-foreground mt-8 mb-3">
          {children}
        </h3>
      )
    },
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mt-6 mb-2">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-4 [&:empty]:hidden">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-primary bg-primary/5 pl-5 pr-4 py-4 rounded-r-xl text-muted-foreground italic text-[0.9375rem] leading-relaxed">
        {children}
      </blockquote>
    ),
  },

  list: {
    bullet: ({ children }) => (
      <ul className="my-4 space-y-2 pl-5 list-disc marker:text-primary">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 space-y-2 pl-5 list-decimal marker:text-primary marker:font-semibold">
        {children}
      </ol>
    ),
  },

  listItem: {
    bullet: ({ children }) => (
      <li className="text-[0.9375rem] text-muted-foreground leading-relaxed pl-1">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-[0.9375rem] text-muted-foreground leading-relaxed pl-1">{children}</li>
    ),
  },
}

interface BlogBodyProps {
  value: BlogBodyBlock[]
  className?: string
}

export function BlogBody({ value, className }: BlogBodyProps) {
  if (!value?.length) return null
  return (
    <div className={cn('min-w-0', className)}>
      <PortableText value={value as PortableTextBlock[]} components={portableComponents} />
    </div>
  )
}
