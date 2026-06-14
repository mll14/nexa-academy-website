import { PortableText } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cn } from '@/lib/utils'

const components = {
  types: {
    image: ({ value }: { value: { asset: unknown; alt?: string } }) => (
      <figure className="my-8">
        <div className="relative overflow-hidden rounded-xl">
          <Image
            src={urlFor(value).width(900).url()}
            alt={value.alt ?? ''}
            width={900}
            height={500}
            className="w-full object-cover"
          />
        </div>
        {value.alt && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">{value.alt}</figcaption>
        )}
      </figure>
    ),
  },
  marks: {
    link: ({ children, value }: { children: React.ReactNode; value?: { href: string; blank?: boolean } }) => {
      const isSafe = (href: string) => /^https?:\/\//i.test(href) || href.startsWith('/')
      if (!value?.href || !isSafe(value.href)) return <>{children}</>
      return (
        <a
          href={value.href}
          target={value.blank ? '_blank' : undefined}
          rel={value.blank ? 'noopener noreferrer' : undefined}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {children}
        </a>
      )
    },
  },
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight text-foreground">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mt-8 mb-3 text-xl font-semibold text-foreground">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="mt-6 mb-2 text-lg font-semibold text-foreground">{children}</h4>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="my-6 border-l-4 border-primary pl-6 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-4 leading-relaxed text-foreground/80">{children}</p>
    ),
  },
}

interface PortableTextRendererProps {
  value: PortableTextBlock[]
  className?: string
}

export function PortableTextRenderer({ value, className }: PortableTextRendererProps) {
  return (
    <div className={cn('prose prose-lg max-w-none', className)}>
      <PortableText value={value} components={components} />
    </div>
  )
}
