import { getJsonServerBaseUrl } from '../config/api'
import type { PatientRecord } from '../types'

const patientsPath = () => `${getJsonServerBaseUrl()}/api/patients`

export async function fetchPatients(): Promise<PatientRecord[]> {
  const res = await fetch(patientsPath())
  if (!res.ok) {
    throw new Error(`Failed to load patients: ${res.status}`)
  }
  const data = (await res.json()) as PatientRecord[]
  return Array.isArray(data) ? data.filter((p) => p.isActive !== false) : []
}

/** All patients including inactive (for admin search over full dataset if needed). */
export async function fetchAllPatients(): Promise<PatientRecord[]> {
  const res = await fetch(patientsPath())
  if (!res.ok) {
    throw new Error(`Failed to load patients: ${res.status}`)
  }
  const data = (await res.json()) as PatientRecord[]
  return Array.isArray(data) ? data : []
}

export async function fetchPatientById(id: string): Promise<PatientRecord | null> {
  const res = await fetch(`${patientsPath()}/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load patient: ${res.status}`)
  }
  return res.json() as Promise<PatientRecord>
}

export async function createPatient(record: PatientRecord): Promise<PatientRecord> {
  const res = await fetch(patientsPath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Failed to create patient: ${res.status}`)
  }
  return res.json() as Promise<PatientRecord>
}

export async function updatePatient(id: string, partial: Partial<PatientRecord>): Promise<PatientRecord> {
  const res = await fetch(`${patientsPath()}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Failed to update patient: ${res.status}`)
  }
  return res.json() as Promise<PatientRecord>
}

export async function softDeletePatient(id: string): Promise<PatientRecord> {
  return updatePatient(id, { isActive: false })
}
