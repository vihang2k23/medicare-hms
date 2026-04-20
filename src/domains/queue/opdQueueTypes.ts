/** Module 2 — OPD queue token types (state in `queueSlice`). */

export type OpdTokenStatus = 'waiting' | 'in-progress' | 'done' | 'skipped'

export interface OpdQueueToken {
  tokenId: number
  patientName: string
  department: string
  doctorId: string
  /** Denormalized for display (resolved at issue time). */
  doctorName: string
  issuedAt: number
  status: OpdTokenStatus
}
