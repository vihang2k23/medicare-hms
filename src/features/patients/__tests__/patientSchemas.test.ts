import { patientRecordToFormValues, step1Schema, step2Schema } from '../patientSchemas'
import type { PatientRecord } from '../../../shared/types/patient'

describe('step1Schema', () => {
  it('accepts valid personal fields', () => {
    const r = step1Schema.safeParse({
      fullName: 'Jane Doe',
      dob: '1990-05-01',
      gender: 'female',
      bloodGroup: 'O+',
      photo: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects short full name', () => {
    const r = step1Schema.safeParse({
      fullName: 'J',
      dob: '1990-05-01',
      gender: 'male',
      bloodGroup: 'A+',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const err = r.error.flatten().fieldErrors.fullName
      expect(err && err.length > 0).toBe(true)
    }
  })

  it('rejects empty date of birth', () => {
    const r = step1Schema.safeParse({
      fullName: 'Jane',
      dob: '',
      gender: 'male',
      bloodGroup: 'A+',
    })
    expect(r.success).toBe(false)
  })

  it('rejects invalid gender', () => {
    const r = step1Schema.safeParse({
      fullName: 'Jane Doe',
      dob: '1990-05-01',
      gender: 'invalid',
      bloodGroup: 'A+',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty blood group', () => {
    const r = step1Schema.safeParse({
      fullName: 'Jane Doe',
      dob: '1990-05-01',
      gender: 'male',
      bloodGroup: '',
    })
    expect(r.success).toBe(false)
  })

  it('rejects future date of birth', () => {
    const r = step1Schema.safeParse({
      fullName: 'Jane Doe',
      dob: '2099-12-31',
      gender: 'male',
      bloodGroup: 'A+',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.dob?.join('')).toMatch(/future/i)
    }
  })
})

describe('step2Schema', () => {
  const base = {
    phone: '9876543210',
    email: 'jane@example.com',
    address: '123 Main Road',
    city: 'Mumbai',
    state: 'MH',
    pin: '400001',
  }

  it('accepts valid contact fields', () => {
    expect(step2Schema.safeParse(base).success).toBe(true)
  })

  it('rejects phone that is too short', () => {
    const r = step2Schema.safeParse({ ...base, phone: '123' })
    expect(r.success).toBe(false)
  })

  it('rejects phone with invalid characters', () => {
    const r = step2Schema.safeParse({ ...base, phone: 'abc9876543210' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const r = step2Schema.safeParse({ ...base, email: 'not-an-email' })
    expect(r.success).toBe(false)
  })

  it('rejects short address', () => {
    const r = step2Schema.safeParse({ ...base, address: '1234' })
    expect(r.success).toBe(false)
  })

  it('rejects PIN shorter than 4 chars', () => {
    const r = step2Schema.safeParse({ ...base, pin: '123' })
    expect(r.success).toBe(false)
  })
})

describe('patientRecordToFormValues', () => {
  const baseRec: PatientRecord = {
    id: 'MED-1',
    fullName: 'Jane',
    dob: '1990-01-01',
    gender: 'female',
    bloodGroup: 'A+',
    phone: '9876543210',
    email: 'j@ex.com',
    address: 'Addr',
    city: 'City',
    state: 'ST',
    pin: '12345',
    photo: null,
    allergies: '',
    chronicConditions: '',
    pastSurgeries: '',
    currentMedications: '',
    emergencyName: 'E',
    emergencyRelationship: 'Sib',
    emergencyPhone: '9123456789',
    createdAt: 1,
    isActive: true,
  }

  it('maps persisted fields and normalizes nullables', () => {
    const v = patientRecordToFormValues(baseRec)
    expect(v.fullName).toBe('Jane')
    expect(v.photo).toBeNull()
    expect(v.allergies).toBe('')
  })

  it('falls back to empty strings when medical fields are undefined', () => {
    const v = patientRecordToFormValues({
      ...baseRec,
      allergies: undefined,
      chronicConditions: undefined,
      pastSurgeries: undefined,
      currentMedications: undefined,
    } as unknown as PatientRecord)
    expect(v.allergies).toBe('')
    expect(v.chronicConditions).toBe('')
    expect(v.pastSurgeries).toBe('')
    expect(v.currentMedications).toBe('')
  })

  it('uses defined optional strings when present on loose input', () => {
    const loose = {
      ...baseRec,
      photo: 'data:image/png;base64,xx',
      allergies: 'nuts',
      chronicConditions: 'asthma',
      pastSurgeries: 'none',
      currentMedications: 'none',
    }
    const v = patientRecordToFormValues(loose as unknown as PatientRecord)
    expect(v.photo).toBe('data:image/png;base64,xx')
    expect(v.allergies).toBe('nuts')
    expect(v.chronicConditions).toBe('asthma')
    expect(v.pastSurgeries).toBe('none')
    expect(v.currentMedications).toBe('none')
  })
})
