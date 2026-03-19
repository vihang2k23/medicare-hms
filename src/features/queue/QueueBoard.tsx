import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function QueueBoard() {
  const { tokens, currentToken, simulationRunning } = useSelector((state: RootState) => state.queue)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
      <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">OPD Token Queue</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Current token: <strong>{currentToken ?? '—'}</strong>
        {simulationRunning && <span className="ml-2 text-amber-600 dark:text-amber-400">Simulation running</span>}
      </p>
      {tokens.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Queue is empty.</p>
      ) : ( 
        <ul className="space-y-1">
          {tokens.map((t) => (
            <li
              key={t.tokenNumber}
              className={`flex justify-between p-2 rounded text-sm ${
                t.tokenNumber === currentToken
                  ? 'bg-blue-100 dark:bg-blue-900/40 font-medium text-slate-800 dark:text-slate-100'
                  : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
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
