import type { Metadata } from 'next'
import { urlFor } from '@/lib/sanity/image'
import type { SEO } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

function ogImageUrl(image: SEO['ogImage']): string | undefined {
  if (!image?.asset) return undefined
  try { return urlFor(image).width(1200).height(630).url() } catch { return undefined }
}

/**
 * Builds a complete Next.js Metadata object from Sanity SEO fields.
 *
 * @param seo        Page-level SEO object from Sanity (title, description, ogImage, noIndex)
 * @param fallback   Fallback title/description when the page has no Sanity SEO document
 * @param siteName   Site name from siteSettings
 * @param defaultOgImage Site-wide fallback ogImage from siteSettings.defaultSeo
 */
export function buildMetadata(
  seo: SEO | null | undefined,
  fallback: { title?: string; description?: string } = {},
  siteName = 'Nexa Academy',
  defaultOgImage?: SEO['ogImage'],
): Metadata {
  const title = seo?.title ?? fallback.title
  const description = seo?.description ?? fallback.description
  const imageUrl = ogImageUrl(seo?.ogImage) ?? ogImageUrl(defaultOgImage)
  const images = imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title ?? siteName }] : undefined

  return {
    title,
    description,
    openGraph: {
      siteName,
      url: SITE_URL,
      type: 'website',
      ...(title && { title }),
      ...(description && { description }),
      ...(images && { images }),
    },
    twitter: {
      card: 'summary_large_image',
      ...(title && { title }),
      ...(description && { description }),
      ...(images && { images: [images[0].url] }),
    },
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
  }
}
