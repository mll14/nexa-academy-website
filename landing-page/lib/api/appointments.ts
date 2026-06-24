const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'

export interface AppointmentSlot {
  time: string
  status: 'available' | 'busy' | 'holiday' | 'blackout'
}

export interface AppointmentPayload {
  name: string
  email: string
  phone: string
  appointment_type: 'physical' | 'virtual'
  host: 'admissions_manager' | 'technical_mentor'
  chosen_time: string
  reason: string
  attendees?: string[]
  recaptchaToken?: string
}

export async function getAppointmentSlots(): Promise<AppointmentSlot[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/appointments/available_slots/`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function bookAppointment(
  payload: AppointmentPayload,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/appointments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>
      if (err.detail) return { success: false, error: String(err.detail) }
      const msgs = Object.values(err)
        .flatMap((v) => (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : []))
      return { success: false, error: msgs.join(' ') || `Request failed (${res.status})` }
    }
    const data = await res.json()
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
