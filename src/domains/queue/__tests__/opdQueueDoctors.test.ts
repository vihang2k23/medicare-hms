import type { ScheduleDoctor } from '../../appointments/types'
import { pickDoctorForDepartment } from '../opdQueueDoctors'

const orthoOnly: ScheduleDoctor[] = [
  {
    id: 'O99',
    name: 'Dr. Ortho Only',
    department: 'Orthopedics',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
  },
]

describe('pickDoctorForDepartment', () => {
  it('returns the doctor matching the department on the default roster', () => {
    expect(pickDoctorForDepartment('Cardiology')).toEqual({
      doctorId: 'D4',
      doctorName: 'Dr. Nair',
    })
  })

  it('falls back to General OPD when the department is not on the roster', () => {
    const picked = pickDoctorForDepartment('Dermatology')
    expect(picked.doctorId).toBe('D1')
    expect(picked.doctorName).toBe('Dr. Sharma')
  })

  it('uses a custom roster when provided', () => {
    expect(pickDoctorForDepartment('Orthopedics', orthoOnly)).toEqual({
      doctorId: 'O99',
      doctorName: 'Dr. Ortho Only',
    })
  })

  it('falls back to General OPD then first row when department missing from custom roster', () => {
    const roster: ScheduleDoctor[] = [
      {
        id: 'G1',
        name: 'Dr. General',
        department: 'General OPD',
        workingDays: [1],
        startTime: '09:00',
        endTime: '12:00',
        slotDurationMinutes: 15,
      },
      orthoOnly[0],
    ]
    expect(pickDoctorForDepartment('Cardiology', roster)).toEqual({
      doctorId: 'G1',
      doctorName: 'Dr. General',
    })
  })

  it('uses default roster when roster is empty', () => {
    expect(pickDoctorForDepartment('Pediatrics', [])).toEqual({
      doctorId: 'D2',
      doctorName: 'Dr. Patel',
    })
  })

  it('falls back to the first roster row when there is no General OPD match', () => {
    expect(pickDoctorForDepartment('Dermatology', orthoOnly)).toEqual({
      doctorId: 'O99',
      doctorName: 'Dr. Ortho Only',
    })
  })
})
