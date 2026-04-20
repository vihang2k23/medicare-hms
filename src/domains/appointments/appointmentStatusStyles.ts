import type { AppointmentStatus } from './types'

/** Ring + background for appointment cards in the calendar (light + dark). */
export function appointmentStatusClasses(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'ring-sky-500/40 bg-sky-500/15 text-sky-950 dark:text-white border-sky-400/50'
    case 'confirmed':
      return 'ring-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:text-white border-emerald-400/50'
    case 'in-progress':
      return 'ring-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-white border-amber-400/50'
    case 'completed':
      return 'ring-slate-400/40 bg-slate-500/10 text-slate-800 dark:text-white border-slate-400/40'
    case 'cancelled':
      return 'ring-red-400/40 bg-red-500/10 text-red-900 dark:text-white border-red-400/40 line-through opacity-70'
    case 'no-show':
      return 'ring-orange-500/40 bg-orange-500/15 text-orange-950 dark:text-white border-orange-400/50'
    default:
      return 'ring-slate-400/30 bg-slate-500/10 text-slate-800 dark:text-white'
  }
}
