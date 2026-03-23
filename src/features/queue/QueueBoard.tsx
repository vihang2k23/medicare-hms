import { useSelector } from 'react-redux'
import { ListOrdered } from 'lucide-react'
import type { RootState } from '../../app/store'
import type { QueueTokenStatus } from './queueSlice'

function statusBadge(status: QueueTokenStatus) {
  const map: Record<QueueTokenStatus, string> = {
    waiting: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    'in-progress': 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
    done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
    skipped: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
  }
  const label: Record<QueueTokenStatus, string> = {
    waiting: 'Waiting',
    'in-progress': 'In progress',
    done: 'Done',
    skipped: 'Skipped',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  )
}

export default function QueueBoard() {
  const { tokens, currentToken, simulationRunning, servedToday } = useSelector((state: RootState) => state.queue)

  const ordered = [...tokens].sort((a, b) => {
    const order: QueueTokenStatus[] = ['in-progress', 'waiting', 'skipped', 'done']
    return order.indexOf(a.status) - order.indexOf(b.status) || a.tokenNumber.localeCompare(b.tokenNumber)
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
          OPD token queue
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Now serving: <strong className="text-slate-800 dark:text-slate-200">{currentToken ?? '—'}</strong>
          </span>
          <span>
            Served (session): <strong className="text-slate-800 dark:text-slate-200">{servedToday}</strong>
          </span>
          {simulationRunning && <span className="text-amber-600 dark:text-amber-400">Simulation running</span>}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Queue is empty. Issue a token to begin.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((t) => {
            const isCurrent = t.tokenNumber === currentToken
            return (
              <li
                key={t.tokenNumber}
                className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[minmax(4rem,auto)_1fr_auto] gap-2 sm:gap-3 items-center p-3 rounded-lg text-sm border ${
                  isCurrent
                    ? 'border-sky-300 dark:border-sky-600 bg-sky-50/80 dark:bg-sky-900/25'
                    : 'border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-700/30'
                }`}
              >
                <span className="font-mono font-semibold text-sky-700 dark:text-sky-300">{t.tokenNumber}</span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{t.patientName}</p>
                  {t.department && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.department}</p>
                  )}
                </div>
                <div className="justify-self-end">{statusBadge(t.status)}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
