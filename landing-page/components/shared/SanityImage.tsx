import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { SanityImage as SanityImageType } from '@/types'

interface SanityImageProps {
  image: SanityImageType
  alt?: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
  sizes?: string
}

export function SanityImage({
  image,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: SanityImageProps) {
  if (!image?.asset) return null

  const src = urlFor(image).url()
  const resolvedAlt = alt ?? image.alt ?? ''

  if (fill) {
    return (
      <Image
        src={src}
        alt={resolvedAlt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={resolvedAlt}
      width={width ?? 800}
      height={height ?? 600}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  )
}
