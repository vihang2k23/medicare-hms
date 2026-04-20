import { findSchedulingConflict } from '../appointmentsSlice'
import { slotsOverlap } from '../slotUtils'
import type { Appointment } from '../types'

function apt(partial: Partial<Appointment> & Pick<Appointment, 'id' | 'slotStart' | 'slotEnd'>): Appointment {
  return {
    patientId: 'P1',
    patientName: 'Patient',
    doctorId: 'D1',
    doctorName: 'Dr.',
    department: 'General OPD',
    date: '2026-04-15',
    status: 'scheduled',
    createdAt: 1,
    ...partial,
  }
}

describe('slotsOverlap', () => {
  it('detects overlap when ranges cross', () => {
    expect(slotsOverlap('09:00', '09:30', '09:15', '09:45')).toBe(true)
  })

  it('returns false for adjacent non-overlapping slots', () => {
    expect(slotsOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false)
  })

  it('returns false when one ends before the other starts', () => {
    expect(slotsOverlap('08:00', '08:30', '09:00', '09:30')).toBe(false)
  })
})

describe('findSchedulingConflict', () => {
  const list: Appointment[] = [
    apt({
      id: 'a1',
      slotStart: '10:00',
      slotEnd: '10:30',
      status: 'confirmed',
    }),
    apt({
      id: 'a2',
      doctorId: 'D2',
      slotStart: '10:00',
      slotEnd: '10:30',
      status: 'scheduled',
    }),
    apt({
      id: 'a-cancel',
      slotStart: '11:00',
      slotEnd: '11:30',
      status: 'cancelled',
    }),
    apt({
      id: 'a-noshow',
      slotStart: '12:00',
      slotEnd: '12:30',
      status: 'no-show',
    }),
  ]

  it('returns conflicting appointment for same doctor, date, overlapping time', () => {
    const hit = findSchedulingConflict(list, 'D1', '2026-04-15', '10:15', '10:45')
    expect(hit?.id).toBe('a1')
  })

  it('matches the correct doctor only', () => {
    expect(findSchedulingConflict(list, 'D2', '2026-04-15', '10:00', '10:30')?.id).toBe('a2')
    expect(findSchedulingConflict(list, 'D9', '2026-04-15', '10:00', '10:30')).toBeUndefined()
  })

  it('ignores cancelled and no-show', () => {
    expect(findSchedulingConflict(list, 'D1', '2026-04-15', '11:00', '11:30')).toBeUndefined()
    expect(findSchedulingConflict(list, 'D1', '2026-04-15', '12:00', '12:30')).toBeUndefined()
  })

  it('respects excludeAppointmentId when rescheduling the same slot', () => {
    expect(findSchedulingConflict(list, 'D1', '2026-04-15', '10:00', '10:30', 'a1')).toBeUndefined()
  })
})
