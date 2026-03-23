import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  BedDouble,
  Calendar,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Stethoscope,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react'

/** Lucide icon per sidebar path — single consistent set app-wide. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  '/admin': LayoutDashboard,
  '/admin/opd-queue': ListOrdered,
  '/admin/beds': BedDouble,
  '/admin/patients': Users,
  '/admin/appointments': Calendar,
  '/admin/prescriptions': FileText,
  '/admin/doctors': Stethoscope,
  '/admin/reports': BarChart3,
  '/doctor': LayoutDashboard,
  '/doctor/patients': Users,
  '/doctor/prescriptions': FileText,
  '/doctor/schedule': Calendar,
  '/receptionist': LayoutDashboard,
  '/receptionist/queue': Ticket,
  '/receptionist/registration': UserPlus,
  '/receptionist/appointments': Calendar,
  '/nurse': LayoutDashboard,
  '/nurse/beds': BedDouble,
  '/nurse/vitals': Activity,
}

export function getNavIcon(path: string): LucideIcon {
  return NAV_ICONS[path] ?? LayoutDashboard
}
