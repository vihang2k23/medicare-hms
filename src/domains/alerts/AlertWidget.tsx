import { useSelector } from 'react-redux'
import type { RootState } from '../../store'

// AlertWidget defines the Alert Widget UI surface and its primary interaction flow.
// AlertWidget renders the alert widget UI.
export default function AlertWidget() {
  const alerts = useSelector((state: RootState) => state.alerts.alerts)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
      <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3">System Alerts (last 20)</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500 dark:text-white text-sm">No alerts.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`text-sm p-2 rounded ${
                a.level === 'error'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-white'
                  : a.level === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-white'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-white'
              }`}
            >
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
