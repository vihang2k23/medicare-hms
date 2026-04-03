import { DEFAULT_SCHEDULE_DOCTORS } from '../appointments/appointmentsSlice'
import type { ScheduleDoctor } from '../appointments/types'

/**
 * Pick a schedule doctor for the selected OPD department (first match, else General OPD, else first row).
 * Uses the live `appointments.doctors` roster when provided so NPI-imported doctors participate in the queue.
 */
export function pickDoctorForDepartment(
  department: string,
  roster?: readonly ScheduleDoctor[] | null,
): { doctorId: string; doctorName: string } {
  const list = roster?.length ? roster : DEFAULT_SCHEDULE_DOCTORS
  const d = list.find((x) => x.department === department)
  if (d) return { doctorId: d.id, doctorName: d.name }
  const gen = list.find((x) => x.department === 'General OPD')
  const fallback = gen ?? list[0]
  return { doctorId: fallback.id, doctorName: fallback.name }
}
