import { z } from 'zod'

// Appointment validation schemas
// Add appointment-specific validation rules here

export const appointmentSchema = z.object({
  // Add appointment fields as needed
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason is too long'),
  notes: z.string().optional(),
})

export type AppointmentFormValues = z.infer<typeof appointmentSchema>
