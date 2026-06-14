const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'

export interface ApplicationPayload {
  full_name: string
  email: string
  phone: string
  phone_country: string
  has_basic_knowledge: boolean
  knowledge_description: string
  program: string
  program_name: string
  start_date: string
  payment_plan: string
  estimated_fees: number
  message: string
  status: string
  source: string
  recaptchaToken?: string
}

export async function submitApplication(
  payload: ApplicationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/applications/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>
      if (err.detail) return { success: false, error: String(err.detail) }
      // DRF field errors: { field: ["msg1", "msg2"] }
      const msgs = Object.values(err)
        .flatMap((v) => Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : [])
      return { success: false, error: msgs.join(' ') || `Request failed (${res.status})` }
    }
    const data = await res.json()
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function saveDraft(data: {
  email: string
  full_name: string
  program: string
  step_reached: number
  phone?: string
  program_name?: string
}): Promise<void> {
  try {
    await Promise.allSettled([
      // existing drafts endpoint
      fetch(`${BASE_URL}/api/application-drafts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      // new incomplete-applications endpoint for admin visibility
      fetch(`${BASE_URL}/api/programs/incomplete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          name: data.full_name,
          phone: data.phone ?? '',
          program_slug: data.program,
          program_name: data.program_name ?? '',
          step_reached: data.step_reached,
        }),
      }),
    ])
  } catch {
    // silent — draft saving is best-effort
  }
}

export async function submitHelpMeLead(data: {
  name: string
  email: string
  phone?: string
  message?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/programs/help-me/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return { success: false, error: `Request failed (${res.status})` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function submitComingSoonInterest(data: {
  name: string
  email: string
  phone?: string
  program_slug: string
  program_name: string
  message?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/programs/interest/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return { success: false, error: `Request failed (${res.status})` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function getClientPrograms(): Promise<
  Array<{ id: string | number; slug: string; title: string; price: number | null; coming_soon: boolean }>
> {
  try {
    const res = await fetch(`${BASE_URL}/api/programs/`)
    if (!res.ok) return []
    const data = await res.json()
    const list: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? [])
    return list.map((p) => ({
      id: (p.program_id ?? p.id) as string,
      slug: p.slug as string,
      title: (p.name ?? p.program_name ?? '') as string,
      price: p.price != null ? Number(p.price) : null,
      coming_soon: Boolean(p.coming_soon),
    }))
  } catch {
    return []
  }
}

export async function getClientIntakes(programId: string | number): Promise<
  Array<{ id: string; start_date: string; seats_remaining: number | null; status: string; application_deadline?: string }>
> {
  try {
    const res = await fetch(`${BASE_URL}/api/intakes/?program=${programId}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch {
    return []
  }
}

