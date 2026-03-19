/**
 * Role definitions and route access.
 * Used by ProtectedRoute and Sidebar for role-based UI.
 */
export const ROLES = ['admin', 'doctor', 'receptionist', 'nurse'] as const
export type Role = (typeof ROLES)[number]

/** Default path after login for each role */
export const DEFAULT_DASHBOARD: Record<Role, string> = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
  nurse: '/nurse',
}

/** Which roles can access which path prefixes */
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin: ['/admin'],
  doctor: ['/doctor'],
  receptionist: ['/receptionist'],
  nurse: ['/nurse'],
}

/** Sidebar links shown per role (path, label) */
export const SIDEBAR_LINKS: Record<Role, Array<{ path: string; label: string }>> = {
  admin: [{ path: '/admin', label: 'Dashboard' }],
  doctor: [{ path: '/doctor', label: 'Dashboard' }],
  receptionist: [{ path: '/receptionist', label: 'Dashboard' }, { path: '/receptionist/queue', label: 'Queue Board' }],
  nurse: [{ path: '/nurse', label: 'Dashboard' }, { path: '/nurse/beds', label: 'Bed Grid' }],
}

export function getDefaultDashboard(role: Role): string {
  return DEFAULT_DASHBOARD[role]
}

/** Paths any authenticated user can access (e.g. Access Denied page) */
const SHARED_PATHS = ['/access-denied']

export function canAccessPath(role: Role, pathname: string): boolean {
  if (SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  const allowed = ROLE_ROUTES[role]
  if (!allowed) return false
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}
