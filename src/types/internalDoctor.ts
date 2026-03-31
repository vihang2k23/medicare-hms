import type { ScheduleDoctor } from '../features/appointments/types'

/** Row persisted in JSON Server (`internalDoctors`) — mirrors schedule fields + NPI snapshot. */
export interface InternalDoctorRecord {
  id: string
  npi: string
  name: string
  department: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
  credential?: string
  phone?: string
  fax?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  enumerationType?: string
  taxonomyCode?: string
  taxonomyDesc?: string
  /** Full NPPES result object for profile / audit */
  rawResult: unknown
  importedAt: number
}

export function internalRecordToScheduleDoctor(r: InternalDoctorRecord): ScheduleDoctor {
  return {
    id: r.id,
    name: r.name,
    department: r.department,
    workingDays: r.workingDays,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMinutes: r.slotDurationMinutes,
    lunchBreakStart: r.lunchBreakStart,
    lunchBreakEnd: r.lunchBreakEnd,
    source: 'npi',
    npi: r.npi,
    credential: r.credential,
    phone: r.phone,
    practiceAddressLine1: r.addressLine1,
    practiceCity: r.city,
    practiceState: r.state,
    practicePostalCode: r.postalCode,
    primaryTaxonomyCode: r.taxonomyCode,
    primaryTaxonomyDesc: r.taxonomyDesc,
  }
}
