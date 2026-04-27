/**
 * General-purpose helpers: class-name merging, toast notifications, CSV export, print timestamp.
 */

import { twMerge } from 'tailwind-merge'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

// =============================================================================
// MODAL UTILITIES
// =============================================================================

/** Portal wrapper for modals - renders children to document.body */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

/** Fixed root: scrollable so tall modals / small viewports can move; overscroll stays in overlay. */
export function modalFixedRoot(zClass: string) {
  return `fixed inset-0 ${zClass} overflow-y-auto overscroll-y-contain`
}

/**
 * At least one dynamic viewport tall so flex centering is true vertical center (not stuck to bottom).
 * Use with createPortal -> body for reliable placement under app layout scroll/transform.
 */
export const modalFixedInner =
  'relative box-border flex min-h-[100dvh] w-full max-w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-12'

/** Full-bleed dim layer behind the panel (inside scrollable column). */
export const modalBackdropDim = 'absolute inset-0 min-h-full min-w-full bg-slate-950/50 backdrop-blur-sm'

/** Stronger dim for ward management panel. */
export const modalBackdropDimStrong = 'absolute inset-0 min-h-full min-w-full bg-slate-950/60 backdrop-blur-sm'

// ── Class names ──────────────────────────────────────────────────────────────

/** Join class names and resolve conflicting Tailwind utilities (e.g. `px-*` vs `pl-*`). */
export function cn(...parts: Array<string | undefined | null | false>): string {
  return twMerge(parts.filter(Boolean) as string[])
}

// ── Notifications ────────────────────────────────────────────────────────────

/** Consistent app notifications (react-hot-toast). */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id: string) => toast.dismiss(id),
  promise: toast.promise,
}

// ── CSV export ───────────────────────────────────────────────────────────────

/** RFC-style CSV for Excel / Sheets (UTF-8 BOM for Windows). */

export function escapeCsvCell(v: string): string {
  const s = v ?? ''
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Print timestamp ─────────────────────────────────────────────────────────

export function medicarePrintTimestamp() {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// UI utilities

/** Default string filter for `{ id, label }` option rows used with SearchableIdPicker. */
export function truncateWords(text: string, maxWords: number = 10): string {
  if (!text || text.trim().length === 0) return text
  
  const words = text.trim().split(/\s+/)
  
  if (words.length <= maxWords) return text
  
  const truncated = words.slice(0, maxWords).join(' ')
  return `${truncated}....`
}

export function filterLabeledOption<T extends { id: string; label: string }>(
  item: T,
  query: string,
): boolean {
  const t = query.trim().toLowerCase()
  if (!t) return true
  return item.label.toLowerCase().includes(t) || item.id.toLowerCase().includes(t)
}


// Icon styling utilities

/**
 * Lucide icons use stroke="currentColor". On some surfaces (e.g. Router <Link>, translucent
 * panels) inherited color can wash out in light mode - set stroke explicitly instead.
 */
export const LUCIDE_STROKE_CHROME = 'stroke-[#0f172a] dark:stroke-[#e2e8f0]'

/** White / light form fields - `!` so stroke wins over currentColor from parents */
export const LUCIDE_STROKE_FIELD = '!stroke-slate-800 dark:!stroke-slate-200'

/** Sidebar row - active item; matches role accent pills */
export const LUCIDE_STROKE_SIDEBAR_ACTIVE = {
  blue: 'stroke-[#075985] dark:stroke-[#e0f2fe]',
  green: 'stroke-[#047857] dark:stroke-[#d1fae5]',
  purple: 'stroke-[#5b21b6] dark:stroke-[#ede9fe]',
  orange: 'stroke-[#9a3412] dark:stroke-[#ffedd5]',
} as const
