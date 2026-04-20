import type { Appointment } from './types'

export const APPOINTMENTS_STORAGE_KEY = 'medicare_hms_appointments_v1'

export function loadPersistedAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as Appointment[]) : []
  } catch {
    return []
  }
}
