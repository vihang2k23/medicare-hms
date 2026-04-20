/**
 * Nurse-recorded vitals — persisted via JSON Server (`/vitals`).
 */
export interface VitalRecord {
  id: string
  patientId: string
  recordedAt: number
  /** mmHg */
  systolic?: number
  diastolic?: number
  /** bpm */
  pulse?: number
  /** Celsius */
  tempC?: number
  /** SpO₂ % */
  spo2?: number
  notes?: string
  recordedBy?: string
}
