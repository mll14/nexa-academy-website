import { createClient } from 'next-sanity'
import { cache } from 'react'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
})

const isDev = process.env.NODE_ENV === 'development'

// Deduplicate identical Sanity fetches within a single request lifecycle.
// React.cache requires primitive arguments for cache-key identity, so we
// serialize params/tags to strings before forwarding to the real fetch.
const _cachedFetch = cache(async (
  query: string,
  paramsJson: string,
  tagsStr: string,
  revalidate: number | false,
): Promise<unknown> => {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null
  const params = paramsJson ? JSON.parse(paramsJson) : {}
  const tags = tagsStr ? tagsStr.split('\0') : undefined
  try {
    return await client.fetch(query, params, {
      token: process.env.SANITY_API_READ_TOKEN,
      next: {
        revalidate: isDev ? 0 : revalidate,
        ...(tags ? { tags } : {}),
      },
    })
  } catch (err) {
    console.error('[sanityFetch] fetch failed:', err)
    return null
  }
})

export async function sanityFetch<T>({
  query,
  params = {},
  tags,
  revalidate = 3600,
}: {
  query: string
  params?: Record<string, unknown>
  tags?: string[]
  revalidate?: number | false
}): Promise<T | null> {
  const paramsJson = Object.keys(params).length ? JSON.stringify(params) : ''
  const tagsStr = tags?.join('\0') ?? ''
  return _cachedFetch(query, paramsJson, tagsStr, revalidate) as Promise<T | null>
}
