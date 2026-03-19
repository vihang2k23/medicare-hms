import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subLabel?: string
  icon?: ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}

const accentStyles = {
  blue: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

export default function StatCard({ label, value, subLabel, icon, accent = 'slate' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          {subLabel && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subLabel}</p>
          )}
        </div>
        {icon && (
          <div className={`rounded-lg p-2 ${accentStyles[accent]}`}>{icon}</div>
        )}
      </div>
    </div>
  )
}
