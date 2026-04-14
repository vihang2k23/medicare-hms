import type { Appointment } from '../../features/appointments/types'
import type { Prescription } from '../../features/prescriptions/types'
import type { BillingRecord, BillingRecordStatus } from '../types/billing'

const STATUSES: BillingRecordStatus[] = ['paid', 'paid', 'pending', 'partial']

function statusForIndex(i: number): BillingRecordStatus {
  return STATUSES[i % STATUSES.length]!
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
      status: a.status === 'completed' ? 'paid' : statusForIndex(i++),
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
      status: rx.status === 'cancelled' ? 'partial' : rx.status === 'completed' ? 'paid' : statusForIndex(i++),
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
