import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function QueueBoard() {
  const { tokens, currentToken, simulationRunning } = useSelector((state: RootState) => state.queue)

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-medium text-gray-800 mb-2">OPD Token Queue</h2>
      <p className="text-sm text-gray-500 mb-3">
        Current token: <strong>{currentToken ?? '—'}</strong>
        {simulationRunning && <span className="ml-2 text-amber-600">Simulation running</span>}
      </p>
      {tokens.length === 0 ? (
        <p className="text-gray-500 text-sm">Queue is empty.</p>
      ) : (
        <ul className="space-y-1">
          {tokens.map((t) => (
            <li
              key={t.tokenNumber}
              className={`flex justify-between p-2 rounded text-sm ${
                t.tokenNumber === currentToken ? 'bg-blue-100 font-medium' : 'bg-gray-50'
              }`}
            >
              <span>{t.tokenNumber}</span>
              <span>{t.patientName}</span>
              <span className="capitalize">{t.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
