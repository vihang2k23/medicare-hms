import { fetchPatients } from '../../services/patientsApi'

/** Generate unique patient id: MED-YYYY-XXXX (checks existing IDs from JSON Server). */
export async function generatePatientId(): Promise<string> {
  const year = new Date().getFullYear()
  let existing: Set<string>
  try {
    const list = await fetchPatients()
    existing = new Set(list.map((p) => p.id))
  } catch {
    existing = new Set()
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const id = `MED-${year}-${Math.floor(1000 + Math.random() * 9000)}`
    if (!existing.has(id)) return id
  }
  return `MED-${year}-${Date.now()}`
}
