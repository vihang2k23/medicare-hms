import type { ReactNode } from 'react'

interface DashboardCardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm shadow-slate-200/25 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 transition-shadow duration-300 hover:shadow-md hover:shadow-slate-200/40 dark:hover:ring-slate-600/40 ${className}`}
    >
      {title && (
        <div className="px-5 py-3.5 border-b border-slate-100/90 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
