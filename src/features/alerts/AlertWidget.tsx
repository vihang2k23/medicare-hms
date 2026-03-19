import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function AlertWidget() {
  const alerts = useSelector((state: RootState) => state.alerts.alerts)

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-medium text-gray-800 mb-3">System Alerts (last 20)</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">No alerts.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`text-sm p-2 rounded ${
                a.level === 'error'
                  ? 'bg-red-50 text-red-800'
                  : a.level === 'warning'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-blue-50 text-blue-800'
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
