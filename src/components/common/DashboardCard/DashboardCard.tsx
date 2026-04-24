import type { ReactNode } from 'react'

// DashboardCard defines the Dashboard Card UI surface and its primary interaction flow.
interface DashboardCardProps {
  title?: ReactNode
  /** Shown on the right side of the title row (e.g. print chart). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

// DashboardCard renders the dashboard card UI.
export default function DashboardCard({ title, actions, children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm shadow-slate-200/25 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 transition-shadow duration-300 hover:shadow-md hover:shadow-slate-200/40 dark:hover:ring-slate-600/40 ${className}`}
    >
      {/* Optional title band standardizes section headings across dashboards. */}
      {title && (
        <div className="px-5 py-3.5 border-b border-slate-100/90 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex-1 min-w-0">{title}</h2>
          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
