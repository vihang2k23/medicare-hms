import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Building2, ChevronRight, Tv } from 'lucide-react'
import { truncateWords } from '../../utils/helpers'
import type { RootState } from '../../store'
import { OPD_DEPARTMENTS, type OpdDepartment } from '../../config/clinical'
import { formatOpdTokenLabel } from '../../store/slices/queueSlice'
import type { OpdQueueToken } from '../../domains/queue/opdQueueTypes'

// QueuePublicBoard defines the Queue Public Board UI surface and its primary interaction flow.
// QueuePublicBoard renders the queue public board UI.
export default function QueuePublicBoard() {
  // Read the full queue from Redux so the public board can derive live display values.
  const queue = useSelector((s: RootState) => s.queue.queue as unknown as OpdQueueToken[])
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)

  // Precompute all board values in one place to avoid recomputing on each render section.
  const { serving, nextFive, deptCounts } = useMemo(() => {
    // Prefer an explicit in-progress token; otherwise fall back to currentToken if available.
    const inProg = queue.find((t) => t.status === 'in-progress')
    const byCurrent = currentToken != null ? queue.find((t) => t.tokenId === currentToken) : undefined
    const servingToken = inProg ?? byCurrent ?? null

    // Keep waiting order as-is and only expose the next 5 tokens to the display panel.
    const waitingInOrder = queue.filter((t) => t.status === 'waiting')
    const nextFive = waitingInOrder.slice(0, 5)

    // Build per-department counts for tokens still active in the queue.
    const counts: Record<string, number> = {}
    for (const d of OPD_DEPARTMENTS) counts[d] = 0
    for (const t of queue) {
      if (t.status === 'waiting' || t.status === 'in-progress') {
        // Guard unknown department values by grouping them under "Other".
        const key: OpdDepartment = OPD_DEPARTMENTS.includes(t.department as OpdDepartment)
          ? (t.department as OpdDepartment)
          : 'Other'
        counts[key] = (counts[key] ?? 0) + 1
      }
    }

    return { serving: servingToken, nextFive, deptCounts: counts }
  }, [queue, currentToken])

  return (
    <div className="rounded-2xl border-2 border-sky-200/80 dark:border-sky-800/80 bg-gradient-to-br from-sky-50/90 via-white to-slate-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-5 sm:p-6 shadow-lg shadow-sky-500/10 ring-1 ring-sky-200/50 dark:ring-sky-900/50">
      {/* Board header keeps branding and context visible from a distance. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Tv className="h-6 w-6 text-sky-600 dark:text-white shrink-0" aria-hidden />
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Live queue display</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-white ml-auto">
          Public board
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Primary highlight card for the token currently being served. */}
        <div className="lg:col-span-5 rounded-2xl bg-sky-600 dark:bg-sky-950 text-white p-6 text-center shadow-inner">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100/90 mb-2">Now serving</p>
          {serving ? (
            <>
              <p className="text-5xl sm:text-6xl font-black tabular-nums tracking-tight">{formatOpdTokenLabel(serving.tokenId)}</p>
              <p className="mt-3 text-sm font-medium text-sky-100 truncate">{truncateWords(serving.patientName, 10)}</p>
              <p className="text-xs text-sky-200/90 mt-1">{serving.department}</p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-sky-100 py-6">No active token</p>
          )}
        </div>

        {/* Compact ordered list of upcoming waiting tokens. */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-3 flex items-center gap-1">
            Next in line
            <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </p>
          {nextFive.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white">No waiting tokens</p>
          ) : (
            <ol className="space-y-2">
              {nextFive.map((t: OpdQueueToken, i: number) => (
                <li
                  key={t.tokenId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm"
                >
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <span className="font-mono font-semibold text-sky-700 dark:text-white">{formatOpdTokenLabel(t.tokenId)}</span>
                  <span className="truncate flex-1 text-right text-slate-700 dark:text-white">{truncateWords(t.patientName, 10)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Live department-wise workload summary for active queue items. */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-3 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            By department
          </p>
          <ul className="space-y-1.5 text-sm">
            {OPD_DEPARTMENTS.map((d) => (
              <li key={d} className="flex justify-between gap-2 text-slate-700 dark:text-white">
                <span className="truncate">{d}</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{deptCounts[d] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
