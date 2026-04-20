import { cn } from '../../../utils/cn'

/** Uppercase micro-label above fields */
export const FIELD_LABEL_CLASS =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5'

/** Shared shell for inputs (width, border, bg, placeholder, focus ring slot) */
export const FIELD_CONTROL_CORE =
  'w-full rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 [color-scheme:light] dark:[color-scheme:dark] shadow-sm focus:outline-none focus:ring-2 disabled:opacity-60 transition-[box-shadow,border-color]'

const FIELD_PADDING = 'px-3.5 py-2.5'

/** Default sky focus ring (filters, modals, tables) */
export const FIELD_FOCUS_SKY = 'focus:ring-sky-500/35 focus:border-sky-400/40'

/** Vitals / warm accent */
export const FIELD_FOCUS_ORANGE = 'focus:ring-orange-500/30 focus:border-orange-400/50'

export const FIELD_INVALID =
  'border-red-500 ring-2 ring-red-500/20 focus:ring-red-500/40 focus:border-red-500'

/** Standard text / number / date inputs */
export function fieldInputClass(options?: { invalid?: boolean; className?: string }): string {
  const { invalid, className } = options ?? {}
  return cn(FIELD_CONTROL_CORE, FIELD_PADDING, FIELD_FOCUS_SKY, invalid && FIELD_INVALID, className)
}

export function fieldInputOrangeClass(options?: { invalid?: boolean; className?: string }): string {
  const { invalid, className } = options ?? {}
  return cn(FIELD_CONTROL_CORE, FIELD_PADDING, FIELD_FOCUS_ORANGE, invalid && FIELD_INVALID, className)
}

/** Registration-style slightly softer field (legacy parity) */
export function fieldInputSoftClass(options?: { invalid?: boolean; className?: string }): string {
  const { invalid, className } = options ?? {}
  return cn(
    'w-full px-3.5 py-2.5 rounded-xl border text-slate-800 dark:text-white bg-white/90 dark:bg-slate-900/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition-shadow',
    invalid ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/90 dark:border-slate-600/80',
    className,
  )
}

export const FIELD_TEXTAREA_CLASS = (options?: { invalid?: boolean; className?: string }) =>
  cn(fieldInputClass(options), 'min-h-[5.5rem] resize-y align-top')

export type SearchFieldAccent = 'sky' | 'orange' | 'violet' | 'emerald'

export const SEARCH_FIELD_FOCUS: Record<SearchFieldAccent, string> = {
  sky: 'focus:ring-sky-500/35 focus:border-sky-400/50',
  orange: 'focus:ring-orange-500/35 focus:border-orange-400/50',
  violet: 'focus:ring-violet-500/35 focus:border-violet-400/50',
  emerald: 'focus:ring-emerald-500/35 focus:border-emerald-400/50',
}

/** Combobox / search inputs: core + accent ring + optional padding overrides */
export function searchFieldInputClass(accent: SearchFieldAccent, extraClass?: string): string {
  return cn(FIELD_CONTROL_CORE, FIELD_PADDING, SEARCH_FIELD_FOCUS[accent], extraClass)
}
