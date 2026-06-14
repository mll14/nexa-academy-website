import type { ApiIntake } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'
const isDev = process.env.NODE_ENV === 'development'

/** Fetch intakes by Django program UUID — use when you have the API program in hand. */
export async function getIntakesForProgram(programId: string | number): Promise<ApiIntake[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/intakes/?program=${programId}`, {
      next: { revalidate: isDev ? 0 : 1800, tags: [`intakes-${programId}`] },
    })
    if (!res.ok) {
      if (res.status !== 404) console.error(`[getIntakesForProgram] API returned ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch (err) {
    console.error('[getIntakesForProgram]', err)
    return []
  }
}

/**
 * Fetch intakes by program name (case-insensitive).
 * Use this in server components that only have the Sanity program name —
 * it avoids the slug-mismatch problem between Sanity and Django.
 */
export async function getIntakesForName(programName: string): Promise<ApiIntake[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/intakes/?program_name=${encodeURIComponent(programName)}`,
      { next: { revalidate: isDev ? 0 : 1800, tags: [`intakes-name-${programName}`] } },
    )
    if (!res.ok) {
      if (res.status !== 404) console.error(`[getIntakesForName] API returned ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch (err) {
    console.error('[getIntakesForName]', err)
    return []
  }
}
