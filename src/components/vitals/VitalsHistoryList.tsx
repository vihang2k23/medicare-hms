import { format } from 'date-fns'
import type { VitalRecord } from '../../types/vitals'

function bp(v: VitalRecord): string {
  if (v.systolic != null && v.diastolic != null) return `${v.systolic}/${v.diastolic}`
  if (v.systolic != null) return `${v.systolic}/—`
  if (v.diastolic != null) return `—/${v.diastolic}`
  return '—'
}

export default function VitalsHistoryList({ rows, emptyLabel }: { rows: VitalRecord[]; emptyLabel?: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel ?? 'No vitals recorded yet.'}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/30 shadow-sm shadow-slate-200/25 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <table className="w-full text-sm text-left min-w-[640px]">
        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 border-b border-slate-200/90 dark:border-slate-700/90">
          <tr>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">When</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">BP</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Pulse</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Temp °C</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">SpO₂</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">By</th>
            <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {rows.map((v) => (
            <tr
              key={v.id}
              className="hover:bg-orange-50/40 dark:hover:bg-orange-950/15 transition-colors"
            >
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap text-[13px]">
                {format(v.recordedAt, 'MMM d, yyyy HH:mm')}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-800 dark:text-slate-100">{bp(v)}</td>
              <td className="px-4 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{v.pulse ?? '—'}</td>
              <td className="px-4 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{v.tempC != null ? v.tempC.toFixed(1) : '—'}</td>
              <td className="px-4 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{v.spo2 != null ? `${v.spo2}%` : '—'}</td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-[13px]">{v.recordedBy ?? '—'}</td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[220px] truncate text-[13px]" title={v.notes}>
                {v.notes ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
