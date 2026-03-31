import { getJsonServerBaseUrl } from '../config/api'
import type { InternalDoctorRecord } from '../types/internalDoctor'

const base = () => `${getJsonServerBaseUrl()}/internalDoctors`

export async function fetchInternalDoctors(): Promise<InternalDoctorRecord[]> {
  const res = await fetch(base())
  if (!res.ok) throw new Error(`Failed to load internal doctors: ${res.status}`)
  const data = (await res.json()) as unknown
  return Array.isArray(data) ? data : []
}

export async function createInternalDoctor(record: InternalDoctorRecord): Promise<InternalDoctorRecord> {
  const res = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`Failed to save doctor: ${res.status}`)
  return res.json() as Promise<InternalDoctorRecord>
}

export async function deleteInternalDoctor(id: string): Promise<void> {
  const res = await fetch(`${base()}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`Failed to remove doctor: ${res.status}`)
}

export async function findInternalDoctorByNpi(npi: string): Promise<InternalDoctorRecord | null> {
  const list = await fetchInternalDoctors()
  return list.find((d) => d.npi === npi) ?? null
}
