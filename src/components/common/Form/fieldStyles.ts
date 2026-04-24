import type { ClassValue } from 'clsx'

// Core field styling
export const FIELD_CONTROL_CORE = 'w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400'

// Label styling
export const FIELD_LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

// Field input classes
export const fieldInputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400'
export const fieldInputOrangeClass = 'w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:border-transparent dark:border-orange-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400'
export const fieldInputSoftClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400'
export const FIELD_TEXTAREA_CLASS = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:border-transparent resize-y dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-400'

// Search field focus styles by accent color
export const SEARCH_FIELD_FOCUS: Record<string, string> = {
  sky: 'focus:ring-sky-500/35 focus:border-sky-400/40',
  emerald: 'focus:ring-emerald-500/35 focus:border-emerald-400/40',
  violet: 'focus:ring-violet-500/35 focus:border-violet-400/40',
  amber: 'focus:ring-amber-500/35 focus:border-amber-400/40',
  rose: 'focus:ring-rose-500/35 focus:border-rose-400/40',
}

export type SearchFieldAccent = keyof typeof SEARCH_FIELD_FOCUS

// Lucide icon stroke for form fields
export const LUCIDE_STROKE_FIELD = 'stroke-slate-400 dark:stroke-slate-500'

// Utility for conditional classes
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ')
}
