import type { AuthUser } from '../../features/auth/authSlice'
import type { Role } from './roles'
import { DEFAULT_SCHEDULE_DOCTORS } from '../../features/appointments/appointmentsSlice'

export interface DemoLoginEntry {
  role: Role
  name: string
  id: string
  avatar: string
}

/** Non-doctor demo accounts (one tap). */
export const DEMO_STAFF_USERS: DemoLoginEntry[] = [
  { role: 'admin', name: 'Admin User', id: 'ADM001', avatar: '' },
  { role: 'receptionist', name: 'Riya Patel', id: 'REC001', avatar: '' },
  { role: 'nurse', name: 'Meena Patel', id: 'NUR001', avatar: '' },
]

/**
 * Doctor demo logins share ids with schedule doctors (D1, D2, …) so appointments,
 * prescriptions, and My Patients filters stay consistent without extra mapping.
 */
export const DEMO_DOCTOR_USERS: DemoLoginEntry[] = DEFAULT_SCHEDULE_DOCTORS.map((d) => ({
  role: 'doctor' as const,
  name: d.name,
  id: d.id,
  avatar: '',
}))

/** Flat list for navbar "Switch account". */
export const ALL_DEMO_LOGIN_ENTRIES: DemoLoginEntry[] = [...DEMO_STAFF_USERS, ...DEMO_DOCTOR_USERS]

export function demoEntryToAuthUser(entry: DemoLoginEntry): AuthUser {
  return { id: entry.id, role: entry.role, name: entry.name, avatar: entry.avatar }
}
