import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function AlertWidget() {
  const alerts = useSelector((state: RootState) => state.alerts.alerts)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
      <h2 className="text-lg font-medium text-gray-800 dark:text-slate-100 mb-3">System Alerts (last 20)</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500 dark:text-slate-400 text-sm">No alerts.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`text-sm p-2 rounded ${
                a.level === 'error'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  : a.level === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
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
