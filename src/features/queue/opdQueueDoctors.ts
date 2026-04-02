import {  } from '../appointments/appointmentsSlice'

/** Pick a schedule doctor for the selected OPD department (first match, else first seed doctor). */
export function pickDoctorForDepartment(department: string): { doctorId: string; doctorName: string } {
  const d = DEFAULT_SCHEDULE_DOCTORS.find((x) => x.department === department)
  if (d) return { doctorId: d.id, doctorName: d.name }
  const gen = DEFAULT_SCHEDULE_DOCTORS.find((x) => x.department === 'General OPD')
  const fallback = gen ?? DEFAULT_SCHEDULE_DOCTORS[0]
  return { doctorId: fallback.id, doctorName: fallback.name }
}
