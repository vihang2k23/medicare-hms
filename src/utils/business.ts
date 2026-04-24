/**
 * Domain / business logic: dashboard metrics, doctor-patient aggregation, billing simulation.
 */

import type { Appointment } from '../domains/appointments/types'
import type { Prescription } from '../domains/prescriptions/types'
import type { BillingRecord, BillingRecordStatus } from '../types'
import { scheduleDoctorIdForAuthUser } from '../config/doctorScheduleMap'

// ── Dashboard metrics ────────────────────────────────────────────────────────

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfLocalDayMs(d = new Date()): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function pendingAppointmentsToday(appointments: Appointment[], todayStr: string): number {
  return appointments.filter(
    (a) => a.date === todayStr && (a.status === 'scheduled' || a.status === 'confirmed'),
  ).length
}

export function topDepartmentsByUniquePatients(
  appointments: Appointment[],
  limit = 5,
): { name: string; patients: number }[] {
  const map = new Map<string, Set<string>>()
  for (const a of appointments) {
    const dept = a.department?.trim()
    if (!dept) continue
    if (!map.has(dept)) map.set(dept, new Set())
    map.get(dept)!.add(a.patientId)
  }
  return [...map.entries()]
    .map(([name, set]) => ({ name, patients: set.size }))
    .sort((x, y) => y.patients - x.patients)
    .slice(0, limit)
}

export function revenueSeriesLast7Days(
  appointments: Appointment[],
  feePerCompleted = 1200,
): { day: string; amount: number }[] {
  const out: { day: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = formatLocalDate(d)
    const completed = appointments.filter((a) => a.date === ds && a.status === 'completed').length
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      amount: completed * feePerCompleted,
    })
  }
  return out
}

export function formatInrCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '₹0'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

export function estimateRevenueToday(
  appointments: Appointment[],
  prescriptionsToday: number,
  todayStr: string,
): number {
  const completed = appointments.filter((a) => a.date === todayStr && a.status === 'completed').length
  return completed * 1200 + prescriptionsToday * 350
}

export function doctorAppointmentsToday(
  appointments: Appointment[],
  doctorId: string,
  todayStr: string,
): Appointment[] {
  return appointments.filter(
    (a) =>
      a.doctorId === doctorId &&
      a.date === todayStr &&
      a.status !== 'cancelled' &&
      a.status !== 'no-show',
  )
}

export function pickNextDoctorAppointment(todayApts: Appointment[]): Appointment | null {
  const inProg = todayApts.find((a) => a.status === 'in-progress')
  if (inProg) return inProg
  const waiting = todayApts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
  const sorted = [...waiting].sort((a, b) => a.slotStart.localeCompare(b.slotStart))
  return sorted[0] ?? null
}

// ── Doctor-patient aggregation ───────────────────────────────────────────────

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

// ── Billing simulation ───────────────────────────────────────────────────────

const BILLING_STATUSES: BillingRecordStatus[] = ['paid', 'paid', 'pending', 'partial']

function billingStatusForIndex(i: number): BillingRecordStatus {
  return BILLING_STATUSES[i % BILLING_STATUSES.length]!
}

function consultationAmount(seed: string): number {
  let h = 0
  for (let j = 0; j < seed.length; j += 1) h = (h * 31 + seed.charCodeAt(j)) >>> 0
  return 65 + (h % 56)
}

/**
 * Demo billing rows inferred from this patient's appointments and prescriptions.
 * Not persisted; replace with `/billing?patientId=` when the API exists.
 */
export function buildSimulatedBillingForPatient(
  patientId: string,
  appointments: Appointment[],
  prescriptions: Prescription[],
): BillingRecord[] {
  const rows: BillingRecord[] = []
  let i = 0

  const apts = appointments.filter((a) => a.patientId === patientId)
  for (const a of apts) {
    if (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'cancelled') continue
    const type =
      a.status === 'no-show' ? 'No-show fee' : a.status === 'completed' ? 'Consultation' : 'Consultation (in progress)'
    rows.push({
      id: `bill-apt-${a.id}`,
      patientId,
      amount:
        a.status === 'no-show'
          ? Math.round(consultationAmount(a.id) * 0.35)
          : consultationAmount(a.id),
      currency: 'USD',
      type,
      description: `${a.doctorName} · ${a.department}${a.reason ? ` · ${a.reason}` : ''}`,
      date: a.date,
      status: a.status === 'completed' ? 'paid' : billingStatusForIndex(i++),
      sourceRef: a.id,
    })
  }

  for (const rx of prescriptions.filter((r) => r.patientId === patientId)) {
    const base = 18 + rx.medicines.length * 14
    const d = new Date(rx.createdAt)
    const iso = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    rows.push({
      id: `bill-rx-${rx.id}`,
      patientId,
      amount: base,
      currency: 'USD',
      type: 'Pharmacy / dispensing',
      description: `Rx ${rx.status} · ${rx.medicines.length} line(s)${rx.diagnosis ? ` · ${rx.diagnosis}` : ''}`,
      date: iso,
      status: rx.status === 'cancelled' ? 'partial' : rx.status === 'completed' ? 'paid' : billingStatusForIndex(i++),
      sourceRef: rx.id,
    })
  }

  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.amount - a.amount))
  return rows
}

export function billingTotals(rows: BillingRecord[]): { total: number; paid: number; outstanding: number } {
  let total = 0
  let paid = 0
  for (const r of rows) {
    total += r.amount
    if (r.status === 'paid') paid += r.amount
    if (r.status === 'partial') paid += r.amount * 0.5
  }
  const outstanding = Math.max(0, total - paid)
  return { total, paid, outstanding }
}
