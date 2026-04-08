import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subLabel?: string
  icon?: ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}

const accentStyles = {
  blue: 'bg-sky-50/90 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 ring-sky-200/60 dark:ring-sky-500/20',
  green: 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-emerald-200/60 dark:ring-emerald-500/20',
  amber: 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-amber-200/60 dark:ring-amber-500/20',
  red: 'bg-red-50/90 dark:bg-red-950/50 text-red-600 dark:text-red-400 ring-red-200/60 dark:ring-red-500/20',
  slate: 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 ring-slate-200/70 dark:ring-slate-600/30',
}

export default function StatCard({ label, value, subLabel, icon, accent = 'slate' }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-4 sm:p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 transition-all duration-300 hover:shadow-md hover:shadow-slate-200/50 dark:hover:ring-slate-600/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">
            {label}
          </p>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums break-words">
            {value}
          </p>
          {subLabel && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subLabel}</p>}
        </div>
        {icon && (
          <div
            className={`stat-card__icon rounded-xl p-2.5 ring-1 shrink-0 transition-transform duration-300 group-hover:scale-105 ${accentStyles[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
