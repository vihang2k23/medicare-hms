import { useDispatch, useSelector } from 'react-redux'
import { ListOrdered } from 'lucide-react'
import type { AppDispatch, RootState } from '../../app/store'
import { formatOpdTokenLabel, markTokenInProgress, updateTokenStatus } from './queueSlice'
import type { OpdTokenStatus } from './opdQueueTypes'

function statusBadge(status: OpdTokenStatus) {
  const map: Record<OpdTokenStatus, string> = {
    waiting: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    'in-progress': 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
    done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
    skipped: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
  }
  const label: Record<OpdTokenStatus, string> = {
    waiting: 'Waiting',
    'in-progress': 'In progress',
    done: 'Done',
    skipped: 'Skipped',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${map[status]} ring-1 ring-black/5 dark:ring-white/10`}
    >
      {label[status]}
    </span>
  )
}

const ROW_STATUS_OPTIONS: { value: OpdTokenStatus; label: string }[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'skipped', label: 'Skipped' },
]

export default function QueueBoard() {
  const dispatch = useDispatch<AppDispatch>()
  const queue = useSelector((s: RootState) => s.queue.queue)
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)
  const simulationRunning = useSelector((s: RootState) => s.queue.simulationRunning)

  const ordered = [...queue].sort((a, b) => {
    const order: OpdTokenStatus[] = ['in-progress', 'waiting', 'skipped', 'done']
    return order.indexOf(a.status) - order.indexOf(b.status) || a.tokenId - b.tokenId
  })

  const onStatusChange = (tokenId: number, value: string) => {
    const next = value as OpdTokenStatus
    if (next === 'in-progress') {
      dispatch(markTokenInProgress(tokenId))
    } else {
      dispatch(updateTokenStatus({ tokenId, status: next }))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
          <ListOrdered className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
          OPD token queue
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Now serving:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {currentToken != null ? formatOpdTokenLabel(currentToken) : '—'}
            </strong>
          </span>
          {simulationRunning && (
            <span className="text-violet-600 dark:text-violet-400 font-medium">Auto-advance on</span>
          )}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Queue is empty. Issue a token to begin.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((t) => {
            const isCurrent = t.tokenId === currentToken
            const label = formatOpdTokenLabel(t.tokenId)
            return (
              <li
                key={t.tokenId}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(4rem,auto)_1fr_auto_auto] gap-2 sm:gap-3 items-center p-3.5 rounded-xl text-sm border transition-colors ${
                  isCurrent
                    ? 'border-sky-300/90 dark:border-sky-600/80 bg-sky-50/90 dark:bg-sky-950/40 ring-1 ring-sky-200/50 dark:ring-sky-500/20'
                    : 'border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <span className="font-mono font-semibold text-sky-700 dark:text-sky-300">{label}</span>
                <div className="min-w-0 sm:col-span-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{t.patientName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t.department} · {t.doctorName}
                  </p>
                </div>
                <div className="justify-self-start sm:justify-self-end">{statusBadge(t.status)}</div>
                <div className="sm:justify-self-end w-full sm:w-auto">
                  <label className="sr-only" htmlFor={`status-${t.tokenId}`}>
                    Status for {label}
                  </label>
                  <select
                    id={`status-${t.tokenId}`}
                    value={t.status}
                    onChange={(e) => onStatusChange(t.tokenId, e.target.value)}
                    className="w-full sm:w-[9.5rem] px-2.5 py-2 rounded-lg border border-slate-200/90 dark:border-slate-600 bg-white/95 dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                  >
                    {ROW_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
