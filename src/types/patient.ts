/**
 * Patient record — persisted via JSON Server (`/patients`).
 */
export interface PatientRecord {
  id: string
  fullName: string
  dob: string
  gender: 'male' | 'female' | 'other'
  bloodGroup: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pin: string
  photo: string | null
  allergies: string
  chronicConditions: string
  pastSurgeries: string
  currentMedications: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  createdAt: number
  isActive: boolean
}
