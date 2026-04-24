import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

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
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: number
}

export interface ScheduleDoctor {
  id: string
  name: string
  department: string
  workingDays: number[] // 1-7 (Mon-Sun)
  startTime: string
  endTime: string
  slotDurationMinutes: number
  source: 'seed' | 'manual' | 'npi'
}

export const DEFAULT_SCHEDULE_DOCTORS: ScheduleDoctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Smith',
    department: 'General OPD',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    source: 'seed',
  },
  {
    id: 'doc-2',
    name: 'Dr. Johnson',
    department: 'Pediatrics',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    source: 'seed',
  },
  {
    id: 'doc-3',
    name: 'Dr. Williams',
    department: 'Cardiology',
    workingDays: [1, 3, 5],
    startTime: '09:00',
    endTime: '15:00',
    slotDurationMinutes: 45,
    source: 'seed',
  },
]

export interface AppointmentsState {
  appointments: Appointment[]
  doctors: ScheduleDoctor[]
}

const initialState: AppointmentsState = {
  appointments: [],
  doctors: DEFAULT_SCHEDULE_DOCTORS,
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    hydrateAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload
    },

    bookAppointment: (state, action: PayloadAction<Omit<Appointment, 'id' | 'createdAt'>>) => {
      const appointment: Appointment = {
        ...action.payload,
        id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        status: action.payload.status || 'scheduled',
      }
      state.appointments.push(appointment)
    },

    rescheduleAppointment: (
      state,
      action: PayloadAction<{
        id: string
        date: string
        slotStart: string
        slotEnd: string
      }>
    ) => {
      const { id, date, slotStart, slotEnd } = action.payload
      const appointment = state.appointments.find(a => a.id === id)
      
      if (appointment && appointment.status !== 'cancelled' && appointment.status !== 'completed') {
        appointment.date = date
        appointment.slotStart = slotStart
        appointment.slotEnd = slotEnd
      }
    },

    updateAppointmentStatus: (
      state,
      action: PayloadAction<{ id: string; status: Appointment['status'] }>
    ) => {
      const { id, status } = action.payload
      const appointment = state.appointments.find(a => a.id === id)
      if (appointment) {
        appointment.status = status
      }
    },

    cancelAppointment: (state, action: PayloadAction<string>) => {
      const appointment = state.appointments.find(a => a.id === action.payload)
      if (appointment && appointment.status !== 'completed') {
        appointment.status = 'cancelled'
      }
    },

    setImportedScheduleDoctors: (state, action: PayloadAction<ScheduleDoctor[]>) => {
      // Keep seed doctors and merge unique imports
      const seedDoctors = state.doctors.filter(d => d.source === 'seed')
      const importedDoctors = action.payload.filter(d => d.source !== 'seed')
      
      // Remove existing imports with same IDs
      const existingImportIds = new Set(importedDoctors.map(d => d.id))
      const filteredDoctors = state.doctors.filter(d => 
        d.source === 'seed' || !existingImportIds.has(d.id)
      )
      
      state.doctors = [...seedDoctors, ...filteredDoctors.filter(d => d.source !== 'seed'), ...importedDoctors]
    },

    addImportedScheduleDoctor: (state, action: PayloadAction<ScheduleDoctor>) => {
      const newDoctor = action.payload
      
      // Don't add if ID already exists
      if (!state.doctors.some(d => d.id === newDoctor.id)) {
        state.doctors.push(newDoctor)
      }
    },

    updateImportedScheduleDoctor: (state, action: PayloadAction<ScheduleDoctor>) => {
      const updatedDoctor = action.payload
      
      // Only update non-seed doctors
      const existingDoctor = state.doctors.find(d => d.id === updatedDoctor.id)
      if (existingDoctor && existingDoctor.source !== 'seed') {
        Object.assign(existingDoctor, updatedDoctor)
      }
    },

    removeImportedScheduleDoctor: (state, action: PayloadAction<string>) => {
      const doctorId = action.payload
      const doctor = state.doctors.find(d => d.id === doctorId)
      
      // Only remove non-seed doctors
      if (doctor && doctor.source !== 'seed') {
        state.doctors = state.doctors.filter(d => d.id !== doctorId)
      }
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
  updateImportedScheduleDoctor,
  removeImportedScheduleDoctor,
} = appointmentsSlice.actions

export default appointmentsSlice.reducer
