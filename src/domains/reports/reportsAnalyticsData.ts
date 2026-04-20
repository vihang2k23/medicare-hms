import { eachDayOfInterval, format, isSameMonth, parseISO, startOfToday, subDays } from 'date-fns'
import type { Appointment } from '../appointments/types'
import type { Bed } from '../beds/bedSlice'

function parseApptDate(d: string): Date | null {
  const x = parseISO(d)
  return Number.isNaN(x.getTime()) ? null : x
}

/** Unique patients per day (last 30 days). */
export function buildPatientsPerDayFromAppointments(appointments: Appointment[]) {
  const end = startOfToday()
  const start = subDays(end, 29)
  const days = eachDayOfInterval({ start, end })
  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    const patients = new Set<string>()
    let visits = 0
    for (const a of appointments) {
      const ad = parseApptDate(a.date)
      if (!ad) continue
      if (format(ad, 'yyyy-MM-dd') !== key) continue
      visits += 1
      patients.add(a.patientId)
    }
    return {
      day: format(day, 'MMM d'),
      dayKey: key,
      patients: patients.size,
      visits,
    }
  })
}

/** Simulated daily occupancy % from current bed grid. */
export function buildSimulatedBedOccupancySeries(beds: Bed[], dayCount = 30) {
  const total = beds.length || 1
  const occupied = beds.filter((b) => b.status === 'occupied').length
  const anchor = Math.round((occupied / total) * 100)
  const seed = occupied * 17 + total * 31
  const end = startOfToday()
  const start = subDays(end, dayCount - 1)
  const days = eachDayOfInterval({ start, end })
  return days.map((day, i) => {
    const n = Math.sin(seed * 0.001 + i * 0.45) * 0.5 + Math.sin(i * 0.73 + seed) * 0.35
    const wobble = Math.round(n * 12)
    const occupancy = Math.min(100, Math.max(0, anchor + wobble + ((i + seed) % 5) - 2))
    return {
      day: format(day, 'MMM d'),
      occupancy,
    }
  })
}

/** Unique patients with at least one booking, grouped by appointment department. */
export function buildDepartmentPatientDistribution(appointments: Appointment[]) {
  const byDept = new Map<string, Set<string>>()
  for (const a of appointments) {
    const dept = a.department?.trim() || 'Other'
    if (!byDept.has(dept)) byDept.set(dept, new Set())
    byDept.get(dept)!.add(a.patientId)
  }
  return [...byDept.entries()]
    .map(([name, set]) => ({ name, value: set.size }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function buildAppointmentOutcomeCounts(appointments: Appointment[]) {
  let completed = 0
  let cancelled = 0
  let noShow = 0
  for (const a of appointments) {
    if (a.status === 'completed') completed += 1
    else if (a.status === 'cancelled') cancelled += 1
    else if (a.status === 'no-show') noShow += 1
  }
  return { completed, cancelled, noShow }
}

/** Appointments per doctor in the current calendar month (local). */
export function buildDoctorWorkloadThisMonth(appointments: Appointment[]) {
  const now = new Date()
  const map = new Map<string, number>()
  for (const a of appointments) {
    const ad = parseApptDate(a.date)
    if (!ad || !isSameMonth(ad, now)) continue
    const key = a.doctorName?.trim() || a.doctorId || 'Unknown'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/** Deterministic pseudo revenue (₹ thousands) by department. */
export function buildSimulatedRevenueByDepartment(departments: readonly string[]) {
  return departments.map((name, i) => {
    let h = 0
    for (let j = 0; j < name.length; j++) h = (h * 31 + name.charCodeAt(j)) >>> 0
    const base = 120 + (h % 180)
    const bump = ((h >> 3) % 40) + i * 7
    return { name, revenue: base + bump }
  })
}
