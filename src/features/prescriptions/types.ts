/** Single line on a prescription — drug names from the in-app static catalog. */
export interface PrescriptionMedicineLine {
  id: string
  /** Display name (usually brand or generic chosen from search). */
  drugName: string
  dosage: string
  frequency: string
  duration?: string
  instructions?: string
  /** Brand / generic names from catalog selection. */
  openfdaBrand?: string[]
  openfdaGeneric?: string[]
  /** Last recall check summary (shown in form + stored for audit). */
  recallAlerts?: PrescriptionRecallSnapshot[]
}

export interface PrescriptionRecallSnapshot {
  recallId: string
  status: string
  classification: string
  reason: string
  productDescription: string
  reportDate: string
}

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled'

export interface Prescription {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  diagnosis?: string
  notes?: string
  medicines: PrescriptionMedicineLine[]
  status: PrescriptionStatus
  createdAt: number
}

/** Drug catalog search hit (static data; same shape as former API mapping). */
export interface OpenFdaLabelHit {
  id: string
  brandNames: string[]
  genericNames: string[]
  routes: string[]
  labeler?: string
  productType?: string
  drugClass?: string
  indications?: string
  commonStrengths?: string[]
}
