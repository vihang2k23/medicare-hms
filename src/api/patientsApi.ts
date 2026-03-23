import { getJsonServerBaseUrl } from '../config/api'
import type { PatientRecord } from '../types/patient'

const patientsPath = () => `${getJsonServerBaseUrl()}/patients`

export async function fetchPatients(): Promise<PatientRecord[]> {
  const res = await fetch(patientsPath())
  if (!res.ok) {
    throw new Error(`Failed to load patients: ${res.status}`)
  }
  const data = (await res.json()) as PatientRecord[]
  return Array.isArray(data) ? data.filter((p) => p.isActive !== false) : []
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
