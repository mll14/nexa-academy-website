import type { ApiProgram } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'
const isDev = process.env.NODE_ENV === 'development'

export async function getPrograms(): Promise<ApiProgram[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/programs/`, {
      next: { revalidate: isDev ? 0 : 3600, tags: ['programs'] },
    })
    if (!res.ok) throw new Error(`Programs API returned ${res.status}`)
    const data = await res.json()
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch (err) {
    console.error('[getPrograms]', err)
    return []
  }
}

export async function getProgramBySlug(slug: string): Promise<ApiProgram | null> {
  try {
    const programs = await getPrograms()
    return programs.find((p) => p.slug === slug || p.program_id === slug) ?? null
  } catch (err) {
    console.error('[getProgramBySlug]', err)
    return null
  }
}
