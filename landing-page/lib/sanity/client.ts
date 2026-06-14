import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
})

const isDev = process.env.NODE_ENV === 'development'

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
  try {
    return await client.fetch<T>(query, params, {
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
}
