import type { Metadata } from 'next'
import { urlFor } from '@/lib/sanity/image'
import type { SEO } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'

/**
 * Serializes a JSON-LD object for safe inline injection via dangerouslySetInnerHTML.
 * Escapes `</` → `<\/` so user-supplied strings (titles, descriptions) cannot
 * prematurely close the surrounding <script> block.
 */
export function serializeJsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj).replace(/<\//g, '<\\/')
}

function ogImageUrl(image: SEO['ogImage']): string | undefined {
  if (!image?.asset) return undefined
  try { return urlFor(image).width(1200).height(630).url() } catch { return undefined }
}

/**
 * Builds a complete Next.js Metadata object from Sanity SEO fields.
 *
 * @param seo            Page-level SEO object from Sanity (title, description, ogImage, noIndex)
 * @param fallback       Fallback title/description when the page has no Sanity SEO document
 * @param siteName       Site name from siteSettings
 * @param defaultOgImage Site-wide fallback ogImage from siteSettings.defaultSeo
 * @param canonicalPath  Path relative to SITE_URL for the canonical URL (e.g. '/programs/web-dev')
 */
export function buildMetadata(
  seo: SEO | null | undefined,
  fallback: { title?: string; description?: string } = {},
  siteName = 'Nexa Academy',
  defaultOgImage?: SEO['ogImage'],
  canonicalPath?: string,
): Metadata {
  const title = seo?.title ?? fallback.title
  const description = seo?.description ?? fallback.description
  const imageUrl = ogImageUrl(seo?.ogImage) ?? ogImageUrl(defaultOgImage)
  const images = imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title ?? siteName }] : undefined
  const pageUrl = canonicalPath ? `${SITE_URL}${canonicalPath}` : SITE_URL

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      siteName,
      url: pageUrl,
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
