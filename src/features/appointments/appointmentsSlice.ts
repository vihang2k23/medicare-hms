import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Appointment, AppointmentStatus, ScheduleDoctor } from './types'
import { slotsOverlap } from './slotUtils'

export const DEFAULT_SCHEDULE_DOCTORS: ScheduleDoctor[] = [
  {
    id: 'D1',
    name: 'Dr. Sharma',
    department: 'General OPD',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
  },
  {
    id: 'D2',
    name: 'Dr. Patel',
    department: 'Pediatrics',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '08:30',
    endTime: '16:30',
    slotDurationMinutes: 20,
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:15',
  },
  {
    id: 'D3',
    name: 'Dr. Kumar',
    department: 'Orthopedics',
    workingDays: [1, 3, 5],
    startTime: '10:00',
    endTime: '15:00',
    slotDurationMinutes: 30,
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:00',
  },
  {
    id: 'D4',
    name: 'Dr. Nair',
    department: 'Cardiology',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 15,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
  },
  {
    id: 'D5',
    name: 'Dr. Reddy',
    department: 'General OPD',
    workingDays: [2, 4, 6],
    startTime: '09:00',
    endTime: '13:00',
    slotDurationMinutes: 30,
  },
]

export function findSchedulingConflict(
  appointments: Appointment[],
  doctorId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
  excludeAppointmentId?: string,
): Appointment | undefined {
  return appointments.find(
    (a) =>
      a.id !== excludeAppointmentId &&
      a.doctorId === doctorId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.status !== 'no-show' &&
      slotsOverlap(slotStart, slotEnd, a.slotStart, a.slotEnd),
  )
}

export interface AppointmentsState {
  appointments: Appointment[]
  doctors: ScheduleDoctor[]
}

const initialState: AppointmentsState = {
  appointments: [],
  doctors: DEFAULT_SCHEDULE_DOCTORS.map((d) => ({ ...d, source: 'seed' as const })),
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    hydrateAppointments(state, action: PayloadAction<Appointment[]>) {
      state.appointments = action.payload
    },
    bookAppointment(state, action: PayloadAction<Omit<Appointment, 'id' | 'createdAt'>>) {
      const p = action.payload
      const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      state.appointments.push({
        ...p,
        status: p.status ?? 'scheduled',
        id,
        createdAt: Date.now(),
      })
    },
    rescheduleAppointment(
      state,
      action: PayloadAction<{ id: string; date: string; slotStart: string; slotEnd: string }>,
    ) {
      const a = state.appointments.find((x) => x.id === action.payload.id)
      if (!a || a.status === 'cancelled') return
      a.date = action.payload.date
      a.slotStart = action.payload.slotStart
      a.slotEnd = action.payload.slotEnd
    },
    updateAppointmentStatus(state, action: PayloadAction<{ id: string; status: AppointmentStatus }>) {
      const a = state.appointments.find((x) => x.id === action.payload.id)
      if (a) a.status = action.payload.status
    },
    cancelAppointment(state, action: PayloadAction<string>) {
      const a = state.appointments.find((x) => x.id === action.payload)
      if (a) a.status = 'cancelled'
    },
    /** Replace NPI-imported rows; keeps seeded defaults from initial merge pattern. */
    setImportedScheduleDoctors(state, action: PayloadAction<ScheduleDoctor[]>) {
      const seeds = state.doctors.filter((d) => d.source === 'seed' || (!d.source && !d.npi))
      const seen = new Set(seeds.map((d) => d.id))
      const imports = action.payload.filter((d) => !seen.has(d.id))
      state.doctors = [...seeds, ...imports]
    },
    addImportedScheduleDoctor(state, action: PayloadAction<ScheduleDoctor>) {
      const d = action.payload
      if (state.doctors.some((x) => x.id === d.id)) return
      state.doctors.push(d)
    },
    removeImportedScheduleDoctor(state, action: PayloadAction<string>) {
      const id = action.payload
      state.doctors = state.doctors.filter((d) => !(d.id === id && d.source === 'npi'))
    },
  },
})

export const {
  hydrateAppointments,
  bookAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  setImportedScheduleDoctors,
  addImportedScheduleDoctor,
  removeImportedScheduleDoctor,
} = appointmentsSlice.actions

export default appointmentsSlice.reducer
