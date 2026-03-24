import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import type { RootState } from '../../app/store'

export default function NotificationBell() {
  const alerts = useSelector((state: RootState) => state.alerts.alerts)
  const count = alerts.length

  return (
    <Link
      to="/admin"
      className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200"
      aria-label="Alerts"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
