import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Activity, CheckCircle2, CircleDashed, SkipForward, Users } from 'lucide-react'
import type { RootState } from '../../app/store'

export default function QueueAnalytics() {
  const { tokens, servedToday, currentToken } = useSelector((s: RootState) => s.queue)

  const stats = useMemo(() => {
    let waiting = 0
    let inProgress = 0
    let done = 0
    let skipped = 0
    for (const t of tokens) {
      if (t.status === 'waiting') waiting += 1
      else if (t.status === 'in-progress') inProgress += 1
      else if (t.status === 'done') done += 1
      else skipped += 1
    }
    return { waiting, inProgress, done, skipped, total: tokens.length }
  }, [tokens])

  const cards = [
    {
      label: 'Waiting',
      value: stats.waiting,
      icon: Users,
      className:
        'from-amber-500/15 to-amber-600/5 text-amber-800 dark:text-amber-200 ring-amber-500/20',
    },
    {
      label: 'In progress',
      value: stats.inProgress,
      icon: CircleDashed,
      className: 'from-sky-500/15 to-sky-600/5 text-sky-800 dark:text-sky-200 ring-sky-500/20',
    },
    {
      label: 'Completed (list)',
      value: stats.done,
      icon: CheckCircle2,
      className:
        'from-emerald-500/15 to-emerald-600/5 text-emerald-800 dark:text-emerald-200 ring-emerald-500/20',
    },
    {
      label: 'Skipped',
      value: stats.skipped,
      icon: SkipForward,
      className: 'from-slate-500/15 to-slate-600/5 text-slate-700 dark:text-slate-200 ring-slate-500/25',
    },
  ] as const

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
          <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
          Queue analytics
        </h2>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono text-slate-700 dark:text-slate-200">{currentToken ?? '—'}</span>
          <span className="mx-1.5 opacity-50">·</span>
          <span>
            Served (session): <strong className="text-slate-800 dark:text-slate-200">{servedToday}</strong>
          </span>
        </div>
      </div>

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

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Tokens in session: <strong className="text-slate-700 dark:text-slate-200">{stats.total}</strong>
        {' · '}
        Completion rate (finished / issued):{' '}
        <strong className="text-slate-700 dark:text-slate-200">
          {stats.total === 0 ? '—' : `${Math.round(((stats.done + stats.skipped) / stats.total) * 100)}%`}
        </strong>
      </p>
    </div>
  )
}
