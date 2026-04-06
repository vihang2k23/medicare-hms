/** Doctor working pattern — used to generate bookable slots (date-fns ISO weekday: Mon = 1 … Sun = 7). */
export interface ScheduleDoctor {
  id: string
  name: string
  department: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
  /** Seeded demo doctors vs registry import vs manually added */
  source?: 'seed' | 'npi' | 'manual'
  npi?: string
  credential?: string
  phone?: string
  practiceAddressLine1?: string
  practiceCity?: string
  practiceState?: string
  practicePostalCode?: string
  primaryTaxonomyCode?: string
  primaryTaxonomyDesc?: string
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  date: string
  slotStart: string
  slotEnd: string
  status: AppointmentStatus
  reason?: string
  notes?: string
  createdAt: number
}
