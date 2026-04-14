/** Simulated billing line for patient profile (derived from visits / Rx until JSON Server has `billing`). */
export type BillingRecordStatus = 'paid' | 'pending' | 'partial'

export interface BillingRecord {
  id: string
  patientId: string
  amount: number
  currency: string
  type: string
  description: string
  /** ISO date (calendar day) */
  date: string
  status: BillingRecordStatus
  sourceRef?: string
}
