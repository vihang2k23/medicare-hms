import { getJsonServerBaseUrl } from '../config/api'
import type { VitalRecord } from '../types/vitals'

const base = () => `${getJsonServerBaseUrl()}/api/vitals`

export async function fetchAllVitals(): Promise<VitalRecord[]> {
  const res = await fetch(base())
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Failed to load vitals: ${res.status}`)
  const data = (await res.json()) as VitalRecord[]
  return Array.isArray(data) ? data : []
}

/** Vitals for one patient, newest first. */
export async function fetchVitalsByPatientId(patientId: string): Promise<VitalRecord[]> {
  const q = new URLSearchParams({ patientId })
  const res = await fetch(`${base()}?${q.toString()}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Failed to load vitals: ${res.status}`)
  const data = (await res.json()) as VitalRecord[]
  const list = Array.isArray(data) ? data : []
  return list.sort((a, b) => b.recordedAt - a.recordedAt)
}

function newVitalId(): string {
  return `vit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function createVital(
  payload: Omit<VitalRecord, 'id' | 'recordedAt'> & { id?: string; recordedAt?: number },
): Promise<VitalRecord> {
  const body: VitalRecord = {
    id: payload.id ?? newVitalId(),
    patientId: payload.patientId,
    recordedAt: payload.recordedAt ?? Date.now(),
    systolic: payload.systolic,
    diastolic: payload.diastolic,
    pulse: payload.pulse,
    tempC: payload.tempC,
    spo2: payload.spo2,
    notes: payload.notes?.trim() || undefined,
    recordedBy: payload.recordedBy,
  }
  const res = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 404) {
    throw new Error(
      'Vitals API returned 404 — restart `npm run server` (it adds a `vitals` collection if missing) or run `npm run seed`.',
    )
  }
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `Failed to save vitals: ${res.status}`)
  }
  return res.json() as Promise<VitalRecord>
}
