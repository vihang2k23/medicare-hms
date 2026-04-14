import { configureStore } from '@reduxjs/toolkit'
import appointmentsReducer, {
  addImportedScheduleDoctor,
  bookAppointment,
  cancelAppointment,
  DEFAULT_SCHEDULE_DOCTORS,
  hydrateAppointments,
  removeImportedScheduleDoctor,
  rescheduleAppointment,
  setImportedScheduleDoctors,
  updateAppointmentStatus,
  updateImportedScheduleDoctor,
} from '../appointmentsSlice'
import type { Appointment, ScheduleDoctor } from '../types'

function makeStore(preloaded?: { appointments: Appointment[]; doctors: ScheduleDoctor[] }) {
  return configureStore({
    reducer: { appointments: appointmentsReducer },
    preloadedState: preloaded
      ? { appointments: preloaded }
      : undefined,
  })
}

const baseApt: Omit<Appointment, 'id' | 'createdAt'> = {
  patientId: 'P1',
  patientName: 'Pat',
  doctorId: 'D1',
  doctorName: 'Dr.',
  department: 'General OPD',
  date: '2026-04-15',
  slotStart: '10:00',
  slotEnd: '10:30',
  status: 'scheduled',
}

describe('appointmentsSlice', () => {
  it('hydrateAppointments replaces the list', () => {
    const store = makeStore()
    const list: Appointment[] = [
      {
        ...baseApt,
        id: 'x1',
        createdAt: 1,
      },
    ]
    store.dispatch(hydrateAppointments(list))
    expect(store.getState().appointments.appointments).toEqual(list)
  })

  it('bookAppointment appends with generated id, createdAt, and default status', () => {
    const store = makeStore()
    store.dispatch(bookAppointment(baseApt))
    const a = store.getState().appointments.appointments[0]
    expect(a).toMatchObject({ ...baseApt, status: 'scheduled' })
    expect(a!.id).toMatch(/^apt-\d+-/)
    expect(typeof a!.createdAt).toBe('number')
  })

  it('bookAppointment keeps explicit status when provided', () => {
    const store = makeStore()
    store.dispatch(bookAppointment({ ...baseApt, status: 'confirmed' }))
    expect(store.getState().appointments.appointments[0]!.status).toBe('confirmed')
  })

  it('bookAppointment defaults status when payload omits it', () => {
    const store = makeStore()
    const { status: _omit, ...rest } = baseApt
    void _omit
    store.dispatch(bookAppointment(rest as Omit<Appointment, 'id' | 'createdAt'>))
    expect(store.getState().appointments.appointments[0]!.status).toBe('scheduled')
  })

  it('rescheduleAppointment updates slot fields when not cancelled', () => {
    const store = makeStore({
      appointments: [{ ...baseApt, id: 'a1', createdAt: 1, status: 'scheduled' }],
      doctors: DEFAULT_SCHEDULE_DOCTORS.map((d) => ({ ...d, source: 'seed' as const })),
    })
    store.dispatch(
      rescheduleAppointment({ id: 'a1', date: '2026-04-16', slotStart: '11:00', slotEnd: '11:30' }),
    )
    const a = store.getState().appointments.appointments[0]
    expect(a!.date).toBe('2026-04-16')
    expect(a!.slotStart).toBe('11:00')
    expect(a!.slotEnd).toBe('11:30')
  })

  it('rescheduleAppointment is a no-op for cancelled appointments', () => {
    const store = makeStore({
      appointments: [{ ...baseApt, id: 'a1', createdAt: 1, status: 'cancelled' }],
      doctors: DEFAULT_SCHEDULE_DOCTORS.map((d) => ({ ...d, source: 'seed' as const })),
    })
    store.dispatch(
      rescheduleAppointment({ id: 'a1', date: '2026-04-16', slotStart: '11:00', slotEnd: '11:30' }),
    )
    expect(store.getState().appointments.appointments[0]!.date).toBe('2026-04-15')
  })

  it('updateAppointmentStatus and cancelAppointment mutate the matching row', () => {
    const store = makeStore({
      appointments: [{ ...baseApt, id: 'a1', createdAt: 1, status: 'scheduled' }],
      doctors: DEFAULT_SCHEDULE_DOCTORS.map((d) => ({ ...d, source: 'seed' as const })),
    })
    store.dispatch(updateAppointmentStatus({ id: 'a1', status: 'completed' }))
    expect(store.getState().appointments.appointments[0]!.status).toBe('completed')
    store.dispatch(cancelAppointment('a1'))
    expect(store.getState().appointments.appointments[0]!.status).toBe('cancelled')
  })

  it('setImportedScheduleDoctors keeps seed doctors and merges unique imports', () => {
    const store = makeStore()
    const seedIds = store.getState().appointments.doctors.map((d) => d.id)
    expect(seedIds.length).toBeGreaterThan(0)

    const npiDoc: ScheduleDoctor = {
      id: 'npi-1',
      name: 'Imported',
      department: 'General OPD',
      workingDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      source: 'npi',
    }
    const dupOfSeed: ScheduleDoctor = {
      ...DEFAULT_SCHEDULE_DOCTORS[0]!,
      id: DEFAULT_SCHEDULE_DOCTORS[0]!.id,
      source: 'manual',
    }

    store.dispatch(setImportedScheduleDoctors([npiDoc, dupOfSeed]))
    const doctors = store.getState().appointments.doctors
    expect(doctors.some((d) => d.id === 'npi-1')).toBe(true)
    expect(doctors.filter((d) => d.id === DEFAULT_SCHEDULE_DOCTORS[0]!.id)).toHaveLength(1)
  })

  it('setImportedScheduleDoctors treats manual- and npi- id prefixes as imports when merging seeds', () => {
    const store = makeStore()
    const beforeCount = store.getState().appointments.doctors.length
    const manualPrefixed: ScheduleDoctor = {
      id: 'manual-99',
      name: 'M',
      department: 'Pediatrics',
      workingDays: [1],
      startTime: '09:00',
      endTime: '10:00',
      slotDurationMinutes: 15,
      source: 'seed',
    }
    store.dispatch(setImportedScheduleDoctors([manualPrefixed]))
    expect(store.getState().appointments.doctors.length).toBeGreaterThanOrEqual(beforeCount)
    expect(store.getState().appointments.doctors.some((d) => d.id === 'manual-99')).toBe(true)
  })

  it('addImportedScheduleDoctor ignores duplicate ids', () => {
    const store = makeStore()
    const d: ScheduleDoctor = {
      id: 'manual-x',
      name: 'X',
      department: 'General OPD',
      workingDays: [1],
      startTime: '09:00',
      endTime: '10:00',
      slotDurationMinutes: 15,
      source: 'manual',
    }
    store.dispatch(addImportedScheduleDoctor(d))
    const n = store.getState().appointments.doctors.length
    store.dispatch(addImportedScheduleDoctor({ ...d, name: 'Y' }))
    expect(store.getState().appointments.doctors.length).toBe(n)
  })

  it('updateImportedScheduleDoctor updates non-seed only', () => {
    const store = makeStore()
    const d: ScheduleDoctor = {
      id: 'manual-up',
      name: 'Before',
      department: 'General OPD',
      workingDays: [1],
      startTime: '09:00',
      endTime: '10:00',
      slotDurationMinutes: 15,
      source: 'manual',
    }
    store.dispatch(addImportedScheduleDoctor(d))
    store.dispatch(updateImportedScheduleDoctor({ ...d, name: 'After' }))
    expect(store.getState().appointments.doctors.find((x) => x.id === 'manual-up')!.name).toBe('After')

    const seedId = DEFAULT_SCHEDULE_DOCTORS[0]!.id
    const seedName = store.getState().appointments.doctors.find((x) => x.id === seedId)!.name
    store.dispatch(
      updateImportedScheduleDoctor({
        ...DEFAULT_SCHEDULE_DOCTORS[0]!,
        id: seedId,
        source: 'seed',
        name: 'Hacked',
      }),
    )
    expect(store.getState().appointments.doctors.find((x) => x.id === seedId)!.name).toBe(seedName)

    store.dispatch(
      updateImportedScheduleDoctor({
        ...d,
        id: 'missing',
        name: 'Nope',
      }),
    )
  })

  it('removeImportedScheduleDoctor removes imported rows but not seed', () => {
    const store = makeStore()
    const d: ScheduleDoctor = {
      id: 'manual-rm',
      name: 'Rm',
      department: 'General OPD',
      workingDays: [1],
      startTime: '09:00',
      endTime: '10:00',
      slotDurationMinutes: 15,
      source: 'manual',
    }
    store.dispatch(addImportedScheduleDoctor(d))
    const seedCount = store.getState().appointments.doctors.filter((x) => x.source === 'seed').length
    store.dispatch(removeImportedScheduleDoctor('manual-rm'))
    expect(store.getState().appointments.doctors.some((x) => x.id === 'manual-rm')).toBe(false)
    store.dispatch(removeImportedScheduleDoctor(DEFAULT_SCHEDULE_DOCTORS[0]!.id))
    expect(store.getState().appointments.doctors.filter((x) => x.source === 'seed')).toHaveLength(seedCount)
  })
})
