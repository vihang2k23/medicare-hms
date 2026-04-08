import type { Appointment } from '../features/appointments/types'
import type { Prescription } from '../features/prescriptions/types'
import { scheduleDoctorIdForAuthUser } from '../config/doctorScheduleMap'

export interface MyPatientRowMeta {
  fromAppointment: boolean
  fromPrescription: boolean
  lastActivityAt: number
  appointmentCount: number
  prescriptionCount: number
  /** Fallback label when the patient API row is missing */
  displayNameHint?: string
}

function appointmentTimestamp(a: Appointment): number {
  const time = a.slotStart.length === 5 ? `${a.slotStart}:00` : a.slotStart
  const t = Date.parse(`${a.date}T${time}`)
  return Number.isFinite(t) ? t : a.createdAt
}

export function aggregateMyPatients(
  authUserId: string | undefined,
  appointments: Appointment[],
  prescriptions: Prescription[],
): Map<string, MyPatientRowMeta> {
  const scheduleDoctorId = scheduleDoctorIdForAuthUser(authUserId)
  const map = new Map<string, MyPatientRowMeta>()

  for (const a of appointments) {
    if (a.doctorId !== scheduleDoctorId || a.status === 'cancelled') continue
    const t = appointmentTimestamp(a)
    const cur = map.get(a.patientId)
    if (!cur) {
      map.set(a.patientId, {
        fromAppointment: true,
        fromPrescription: false,
        lastActivityAt: t,
        appointmentCount: 1,
        prescriptionCount: 0,
        displayNameHint: a.patientName,
      })
    } else {
      cur.fromAppointment = true
      cur.appointmentCount += 1
      cur.lastActivityAt = Math.max(cur.lastActivityAt, t)
      if (!cur.displayNameHint) cur.displayNameHint = a.patientName
    }
  }

  for (const rx of prescriptions) {
    if (rx.doctorId !== authUserId) continue
    const cur = map.get(rx.patientId)
    if (!cur) {
      map.set(rx.patientId, {
        fromAppointment: false,
        fromPrescription: true,
        lastActivityAt: rx.createdAt,
        appointmentCount: 0,
        prescriptionCount: 1,
        displayNameHint: rx.patientName,
      })
    } else {
      cur.fromPrescription = true
      cur.prescriptionCount += 1
      cur.lastActivityAt = Math.max(cur.lastActivityAt, rx.createdAt)
      if (!cur.displayNameHint) cur.displayNameHint = rx.patientName
    }
  }

  return map
}

export function isPatientInDoctorCare(
  authUserId: string | undefined,
  patientId: string,
  appointments: Appointment[],
  prescriptions: Prescription[],
): boolean {
  return aggregateMyPatients(authUserId, appointments, prescriptions).has(patientId)
}
