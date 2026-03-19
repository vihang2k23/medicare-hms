import type { ReactNode } from 'react'

interface DashboardCardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
