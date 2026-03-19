import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../app/store'

export default function NotificationBell() {
  const alerts = useSelector((state: RootState) => state.alerts.alerts)
  const count = alerts.length

  return (
    <Link
      to="/admin"
      className="relative p-2 rounded hover:bg-gray-700 text-white"
      aria-label="Alerts"
    >
      <span className="text-lg">🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
