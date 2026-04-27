import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Activity, CheckCircle2, CircleDashed, Clock, SkipForward, Timer, Users } from 'lucide-react'
import type { RootState } from '../../store'
import { formatOpdTokenLabel } from '../../store/slices/queueSlice'
import type { OpdQueueToken } from './opdQueueTypes'

// QueueAnalytics defines the Queue Analytics UI surface and its primary interaction flow.
// QueueAnalytics renders the queue analytics UI.
export default function QueueAnalytics() {
  const queue = useSelector((s: RootState) => s.queue.queue) as unknown as OpdQueueToken[]
  const servedToday = useSelector((s: RootState) => s.queue.servedToday)
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const { stats, avgWaitMinSim, longestWaitMinSim } = useMemo(() => {
    let waiting = 0
    let inProgress = 0
    let done = 0
    let skipped = 0
    let longestMs = 0
    let waitSumMs = 0
    let waitCount = 0
    for (const t of queue) {
      if (t.status === 'waiting') {
        waiting += 1
        const w = now - t.issuedAt
        longestMs = Math.max(longestMs, w)
        waitSumMs += w
        waitCount += 1
      } else if (t.status === 'in-progress') {
        inProgress += 1
        const w = now - t.issuedAt
        longestMs = Math.max(longestMs, w)
        waitSumMs += w
        waitCount += 1
      } else if (t.status === 'done') done += 1
      else skipped += 1
    }
    const avgWaitMinSim = waitCount === 0 ? null : Math.max(1, Math.round(waitSumMs / waitCount / 60000))
    const longestWaitMinSim = longestMs === 0 ? null : Math.max(1, Math.round(longestMs / 60000))
    return {
      stats: { waiting, inProgress, done, skipped, total: queue.length },
      avgWaitMinSim,
      longestWaitMinSim,
    }
  }, [queue, now])

  const cards = [
    {
      label: 'Waiting',
      value: stats.waiting,
      icon: Users,
      className:
        'from-amber-500/15 to-amber-600/5 text-amber-800 dark:text-white ring-amber-500/20',
    },
    {
      label: 'In progress',
      value: stats.inProgress,
      icon: CircleDashed,
      className: 'from-sky-500/15 to-sky-600/5 text-sky-800 dark:text-white ring-sky-500/20',
    },
    {
      label: 'Completed (list)',
      value: stats.done,
      icon: CheckCircle2,
      className:
        'from-emerald-500/15 to-emerald-600/5 text-emerald-800 dark:text-white ring-emerald-500/20',
    },
    {
      label: 'Skipped',
      value: stats.skipped,
      icon: SkipForward,
      className: 'from-slate-500/15 to-slate-600/5 text-slate-700 dark:text-white ring-slate-500/25',
    },
  ] as const

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      {/* Header surfaces current token and throughput context for quick triage. */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Activity className="h-5 w-5 text-violet-600 dark:text-white shrink-0" aria-hidden />
          Queue analytics
        </h2>
        <div className="text-xs text-slate-500 dark:text-white">
          <span className="font-mono text-slate-700 dark:text-white">
            {currentToken != null ? formatOpdTokenLabel(currentToken) : '—'}
          </span>
          <span className="mx-1.5 opacity-50">·</span>
          <span>
            Served today: <strong className="text-slate-800 dark:text-white">{servedToday}</strong>
          </span>
        </div>
      </div>

      {/* Metric cards expose live queue state by status bucket. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, className }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-4 ring-1 ${className}`}
          >
            <Icon className="absolute right-3 top-3 h-8 w-8 opacity-[0.12]" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-3">
          <Clock className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              Avg wait (live estimate)
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {avgWaitMinSim == null ? '—' : `${avgWaitMinSim} min`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-3">
          <Timer className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              Longest active wait
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {longestWaitMinSim == null ? '—' : `${longestWaitMinSim} min`}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-white">
        Tokens in session: <strong className="text-slate-700 dark:text-white">{stats.total}</strong>
        {' · '}
        Completion rate (finished / issued):{' '}
        <strong className="text-slate-700 dark:text-white">
          {stats.total === 0 ? '—' : `${Math.round(((stats.done + stats.skipped) / stats.total) * 100)}%`}
        </strong>
      </p>
    </div>
  )
}
