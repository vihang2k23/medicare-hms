import { z } from 'zod'
import type { PatientRecord } from '../../shared/types/patient'

export const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Select gender' }),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  photo: z.string().optional().nullable(),
})

export const step2Schema = z.object({
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone format'),
  email: z.string().email('Valid email is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pin: z.string().min(4, 'PIN / ZIP is required').max(12),
})

export const step3Schema = z.object({
  allergies: z.string(),
  chronicConditions: z.string(),
  pastSurgeries: z.string(),
  currentMedications: z.string(),
})

export const step4Schema = z.object({
  emergencyName: z.string().min(2, 'Emergency contact name is required'),
  emergencyRelationship: z.string().min(2, 'Relationship is required'),
  emergencyPhone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone format'),
})

export const patientRegistrationSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)

export type PatientFormValues = z.infer<typeof patientRegistrationSchema>

export const STEP_FIELD_KEYS: (keyof PatientFormValues)[][] = [
  ['fullName', 'dob', 'gender', 'bloodGroup', 'photo'],
  ['phone', 'email', 'address', 'city', 'state', 'pin'],
  ['allergies', 'chronicConditions', 'pastSurgeries', 'currentMedications'],
  ['emergencyName', 'emergencyRelationship', 'emergencyPhone'],
]

export function patientRecordToFormValues(p: PatientRecord): PatientFormValues {
  return {
    fullName: p.fullName,
    dob: p.dob,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    photo: p.photo ?? null,
    phone: p.phone,
    email: p.email,
    address: p.address,
    city: p.city,
    state: p.state,
    pin: p.pin,
    allergies: p.allergies ?? '',
    chronicConditions: p.chronicConditions ?? '',
    pastSurgeries: p.pastSurgeries ?? '',
    currentMedications: p.currentMedications ?? '',
    emergencyName: p.emergencyName,
    emergencyRelationship: p.emergencyRelationship,
    emergencyPhone: p.emergencyPhone,
  }
}
