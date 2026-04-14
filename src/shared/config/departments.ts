/**
 * OPD / clinical department labels — use for queue counters, charts, and mocks.
 * (Inpatient wards stay in `config/wards.ts`.)
 */
export const OPD_DEPARTMENTS = [
  'General OPD',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Other',
] as const

export type OpdDepartment = (typeof OPD_DEPARTMENTS)[number]
