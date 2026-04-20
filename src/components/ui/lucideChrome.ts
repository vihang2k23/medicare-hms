import type { SidebarAccent } from '../../config/roles'

/**
 * Lucide icons use stroke="currentColor". On some surfaces (e.g. Router <Link>, translucent
 * panels) inherited color can wash out in light mode — set stroke explicitly instead.
 */
export const LUCIDE_STROKE_CHROME = 'stroke-[#0f172a] dark:stroke-[#e2e8f0]'

/** White / light form fields — `!` so stroke wins over currentColor from parents */
export const LUCIDE_STROKE_FIELD = '!stroke-slate-800 dark:!stroke-slate-200'

/** Sidebar row — active item; matches role accent pills */
export const LUCIDE_STROKE_SIDEBAR_ACTIVE: Record<SidebarAccent, string> = {
  blue: 'stroke-[#075985] dark:stroke-[#e0f2fe]',
  green: 'stroke-[#047857] dark:stroke-[#d1fae5]',
  purple: 'stroke-[#5b21b6] dark:stroke-[#ede9fe]',
  orange: 'stroke-[#9a3412] dark:stroke-[#ffedd5]',
}
