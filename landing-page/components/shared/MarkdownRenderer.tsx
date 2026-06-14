import { PortableText, type PortableTextReactComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cn } from '@/lib/utils'

const components: Partial<PortableTextReactComponents> = {
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
          <figcaption className="mt-2 text-center text-xs text-muted-foreground">
            {value.caption}
          </figcaption>
        )}
      </figure>
    ),
  },

  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => (
      <span className="underline underline-offset-2">{children}</span>
    ),
    code: ({ children }) => (
      <code className="rounded-md bg-muted px-1.5 py-0.5 text-[0.8125rem] font-mono text-foreground">
        {children}
      </code>
    ),
    inlineLink: ({ value, children }) => {
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
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-foreground mt-8 mb-3 pb-2 border-b border-border [&:first-child]:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mt-4 mb-1.5">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-4 [&:empty]:hidden">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-5 border-l-4 border-primary bg-primary/5 pl-4 pr-3 py-3 rounded-r-lg text-muted-foreground italic text-sm">
        {children}
      </blockquote>
    ),
  },

  list: {
    bullet: ({ children }) => (
      <ul className="my-4 space-y-1.5 pl-5 list-disc marker:text-primary">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 space-y-1.5 pl-5 list-decimal marker:text-primary marker:font-semibold">
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

interface MarkdownRendererProps {
  value: PortableTextBlock[] | string | unknown
  className?: string
}

export function MarkdownRenderer({ value, className }: MarkdownRendererProps) {
  if (!value) return null

  // String content (raw markdown) — use ReactMarkdown
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return (
      <div className={cn('min-w-0 prose prose-sm max-w-none', className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
      </div>
    )
  }

  // Portable Text blocks
  if (!Array.isArray(value) || value.length === 0) return null

  // Detect markdown syntax stored as plain text in PortableText (typed in the block editor
  // as raw markdown rather than using the formatting toolbar). All blocks will be `normal`
  // style with no formatting marks. Route through ReactMarkdown so syntax like **bold**,
  // ## Heading, and --- render correctly.
  const isRawMarkdownInBlocks = (value as any[]).every(
    (block: any) =>
      block._type === 'block' &&
      (!block.style || block.style === 'normal') &&
      block.children?.every((child: any) => !child.marks?.length),
  )

  if (isRawMarkdownInBlocks) {
    const markdown = (value as any[])
      .map((block: any) => block.children?.map((c: any) => c.text ?? '').join('') ?? '')
      .join('\n\n')
    return (
      <div className={cn('min-w-0', className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border [&:first-child]:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold text-foreground mt-8 mb-3 pb-2 border-b border-border [&:first-child]:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mt-4 mb-1.5">{children}</h4>
            ),
            p: ({ children }) => (
              <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-4 [&:empty]:hidden">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => (
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-[0.8125rem] font-mono text-foreground">{children}</code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-5 border-l-4 border-primary bg-primary/5 pl-4 pr-3 py-3 rounded-r-lg text-muted-foreground italic text-sm">{children}</blockquote>
            ),
            ul: ({ children }) => (
              <ul className="my-4 space-y-1.5 pl-5 list-disc marker:text-primary">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-4 space-y-1.5 pl-5 list-decimal marker:text-primary marker:font-semibold">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-[0.9375rem] text-muted-foreground leading-relaxed pl-1">{children}</li>
            ),
            hr: () => <hr className="my-8 border-border" />,
            a: ({ href, children }) => {
              const isSafe = /^https?:\/\//i.test(href ?? '') || (href ?? '').startsWith('/')
              if (!isSafe) return <span>{children}</span>
              return (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2 hover:opacity-75 transition-opacity"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <PortableText value={value as PortableTextBlock[]} components={components} />
    </div>
  )
}
