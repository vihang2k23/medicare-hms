import type { ScheduleDoctor } from '../../features/appointments/types'

/** ISO weekday: Mon = 1 … Sun = 7 (date-fns `getISODay`). */
export const ISO_WEEKDAY_SHORT: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
}

/** Row persisted in JSON Server (`internalDoctors`) — mirrors schedule fields + NPI snapshot. */
export interface InternalDoctorRecord {
  id: string
  /** Registry NPI, or empty for manual-only providers */
  npi: string
  name: string
  department: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
  /** From NPI import vs added manually in HMS */
  source?: 'npi' | 'manual'
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

export function formatInternalDoctorScheduleSummary(r: InternalDoctorRecord): string {
  const days = [...r.workingDays]
    .sort((a, b) => a - b)
    .map((d) => ISO_WEEKDAY_SHORT[d] ?? String(d))
    .join(', ')
  const lunch =
    r.lunchBreakStart && r.lunchBreakEnd
      ? ` · lunch ${r.lunchBreakStart}–${r.lunchBreakEnd}`
      : ''
  return `${days || '—'} · ${r.startTime}–${r.endTime}${lunch} · ${r.slotDurationMinutes}m slots`
}

export function createManualInternalRecord(input: {
  name: string
  department: string
  npi?: string
  phone?: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
}): InternalDoctorRecord {
  const npiDigits = (input.npi ?? '').replace(/\D/g, '').slice(0, 10)
  return {
    id: `manual-${crypto.randomUUID()}`,
    npi: npiDigits,
    name: input.name.trim(),
    department: input.department.trim(),
    workingDays: input.workingDays,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationMinutes: input.slotDurationMinutes,
    lunchBreakStart: input.lunchBreakStart?.trim() || undefined,
    lunchBreakEnd: input.lunchBreakEnd?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    source: 'manual',
    rawResult: {},
    importedAt: Date.now(),
  }
}

export function internalRecordToScheduleDoctor(r: InternalDoctorRecord): ScheduleDoctor {
  const src = r.source ?? (r.id.startsWith('manual-') ? 'manual' : 'npi')
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
    source: src === 'manual' ? 'manual' : 'npi',
    npi: r.npi || undefined,
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
