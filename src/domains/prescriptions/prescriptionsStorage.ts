import type { Prescription } from './types'
import { PRESCRIPTIONS_STORAGE_KEY } from '../../constants/storageKeys'

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
