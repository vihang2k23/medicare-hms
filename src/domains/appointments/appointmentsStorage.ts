import type { Appointment } from './types'
import { APPOINTMENTS_STORAGE_KEY } from '../../constants/storageKeys'

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
