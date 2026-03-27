import type { Prescription } from './types'

export const PRESCRIPTIONS_STORAGE_KEY = 'medicare_hms_prescriptions_v1'

export function loadPersistedPrescriptions(): Prescription[] {
  try {
    const raw = localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as Prescription[]) : []
  } catch {
    return []
  }
}
