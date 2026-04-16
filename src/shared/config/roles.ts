/**
 * Role definitions and route access.
 * Single ROLE_CONFIG drives sidebar, route access, and accent colors.
 */
export const ROLES = ['admin', 'doctor', 'receptionist', 'nurse'] as const
export type Role = (typeof ROLES)[number]

export type SidebarAccent = 'blue' | 'green' | 'purple' | 'orange'

export interface RoleSidebarLink {
  path: string
  label: string
}

export interface RoleConfigItem {
  /** Access level description */
  accessLevel: string
  /** Primary responsibilities (short) */
  description: string
  /** Sidebar links for this role */
  sidebarLinks: RoleSidebarLink[]
  /** Sidebar/nav accent color */
  accent: SidebarAccent
}

/**
 * Single source of truth for role-based UI:
 * - Admin: full sidebar (all 8 modules)
 * - Doctor: Dashboard, My Patients, Prescriptions, My Schedule
 * - Receptionist: Dashboard, OPD Queue, Patient Registration, Appointments
 * - Nurse: Dashboard, Bed Management, Vitals Entry
 * - Each role has a distinct accent (Blue / Green / Purple / Orange)
 */
export const ROLE_CONFIG: Record<Role, RoleConfigItem> = {
  admin: {
    accessLevel: 'Full Access',
    description: 'View all modules, manage users, analytics, system-wide reports',
    accent: 'blue',
    sidebarLinks: [
      { path: '/admin', label: 'Dashboard' },
      { path: '/admin/opd-queue', label: 'OPD Queue' },
      { path: '/admin/beds', label: 'Bed Management' },
      { path: '/admin/patients', label: 'Patients' },
      { path: '/admin/appointments', label: 'Appointments' },
      { path: '/admin/prescriptions', label: 'Prescriptions' },
      { path: '/admin/doctors', label: 'Doctor Directory' },
      { path: '/admin/reports', label: 'Reports & Analytics' },
    ],
  },
  doctor: {
    accessLevel: 'Limited — own patients only',
    description: 'View assigned patients, write prescriptions, manage schedule',
    accent: 'green',
    sidebarLinks: [
      { path: '/doctor', label: 'Dashboard' },
      { path: '/doctor/patients', label: 'My Patients' },
      { path: '/doctor/prescriptions', label: 'Prescriptions' },
      { path: '/doctor/schedule', label: 'My Schedule' },
    ],
  },
  receptionist: {
    accessLevel: 'OPD + Appointments',
    description: 'Register patients, manage OPD tokens, book appointments',
    accent: 'purple',
    sidebarLinks: [
      { path: '/receptionist', label: 'Dashboard' },
      { path: '/receptionist/queue', label: 'OPD Queue' },
      { path: '/receptionist/registration', label: 'Patient Registration' },
      { path: '/receptionist/appointments', label: 'Appointments' },
    ],
  },
  nurse: {
    accessLevel: 'Ward + Bed management',
    description: 'Update bed status, record vitals, manage ward assignments',
    accent: 'orange',
    sidebarLinks: [
      { path: '/nurse', label: 'Dashboard' },
      { path: '/nurse/beds', label: 'Bed Management' },
      { path: '/nurse/vitals', label: 'Vitals Entry' },
    ],
  },
}

/** Default path after login for each role */
export const DEFAULT_DASHBOARD: Record<Role, string> = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
  nurse: '/nurse',
}

/** Which path prefixes each role can access (admin→/admin, doctor→/doctor, etc.) */
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin: ['/admin'],
  doctor: ['/doctor'],
  receptionist: ['/receptionist'],
  nurse: ['/nurse'],
}

/** Sidebar links per role (from ROLE_CONFIG) */
export const SIDEBAR_LINKS: Record<Role, RoleSidebarLink[]> = (() => {
  const map = {} as Record<Role, RoleSidebarLink[]>
  for (const role of ROLES) {
    map[role] = ROLE_CONFIG[role].sidebarLinks
  }
  return map
})()

export function getDefaultDashboard(role: Role): string {
  return DEFAULT_DASHBOARD[role]
}

/** Paths any authenticated user can access (e.g. Access Denied page) */
const SHARED_PATHS = ['/access-denied']

export function canAccessPath(role: Role, pathname: string): boolean {
  if (pathname === '/' || pathname === '') {
    return true
  }
  if (SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  const allowed = ROLE_ROUTES[role]
  if (!allowed) return false
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}
