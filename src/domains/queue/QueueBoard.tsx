import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ListOrdered } from 'lucide-react'
import { truncateWords } from '../../utils/helpers'
import type { RootState } from '../../store'
import { formatOpdTokenLabel } from './queueSlice'
import type { OpdTokenStatus, OpdQueueToken } from './opdQueueTypes'

// QueueBoard defines the Queue Board UI surface and its primary interaction flow.
function statusBadge(status: OpdTokenStatus) {
  const map: Record<OpdTokenStatus, string> = {
    waiting: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-white',
    'in-progress': 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-white',
    done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-white',
    skipped: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-white',
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

// QueueBoard renders the queue board UI.
export default function QueueBoard() {
  const queue = useSelector((s: RootState) => s.queue.queue) as unknown as OpdQueueToken[]
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)
  const simulationRunning = useSelector((s: RootState) => s.queue.simulationRunning)

  const ordered = [...queue].sort((a, b) => {
    const order: OpdTokenStatus[] = ['in-progress', 'waiting', 'skipped', 'done']
    return order.indexOf(a.status) - order.indexOf(b.status) || a.tokenId - b.tokenId
  })

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <ListOrdered className="h-5 w-5 text-sky-600 dark:text-white shrink-0" aria-hidden />
          OPD token queue
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-white">
          <span>
            Now serving:{' '}
            <strong className="text-slate-800 dark:text-white">
              {currentToken != null ? formatOpdTokenLabel(currentToken) : '—'}
            </strong>
          </span>
          {simulationRunning && (
            <span className="text-violet-600 dark:text-white font-medium">Auto-advance on</span>
          )}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-slate-500 dark:text-white text-sm">Queue is empty. Issue a token to begin.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((t) => {
            const isCurrent = t.tokenId === currentToken
            const label = formatOpdTokenLabel(t.tokenId)
            return (
              <li
                key={t.tokenId}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(4rem,auto)_1fr_auto] gap-2 sm:gap-3 items-center p-3.5 rounded-xl text-sm border transition-colors ${
                  isCurrent
                    ? 'border-sky-300/90 dark:border-sky-600/80 bg-sky-50/90 dark:bg-sky-950/40 ring-1 ring-sky-200/50 dark:ring-sky-500/20'
                    : 'border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <span className="font-mono font-semibold text-sky-700 dark:text-white">{label}</span>
                <div className="min-w-0 sm:col-span-1">
                  <p className="font-medium text-slate-800 dark:text-white truncate">{truncateWords(t.patientName, 10)}</p>
                  <p className="text-xs text-slate-500 dark:text-white truncate">{t.department} · {t.doctorName}</p>
                </div>
                <div className="justify-self-start sm:justify-self-end">{statusBadge(t.status)}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
