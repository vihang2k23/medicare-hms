import type { Appointment } from '../domains/appointments/types'

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
