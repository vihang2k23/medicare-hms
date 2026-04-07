import { Fragment, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import type { VitalRecord } from '../../types/vitals'

function bp(v: VitalRecord): string {
  if (v.systolic != null && v.diastolic != null) return `${v.systolic}/${v.diastolic}`
  if (v.systolic != null) return `${v.systolic}/—`
  if (v.diastolic != null) return `—/${v.diastolic}`
  return '—'
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

export default function VitalsHistoryList({
  rows,
  emptyLabel,
  listKey,
}: {
  rows: VitalRecord[]
  emptyLabel?: string
  /** When this changes (e.g. patient id), pagination resets to page 1. */
  listKey?: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [listKey])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  useEffect(() => {
    setExpandedId(null)
  }, [page, pageSize])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel ?? 'No vitals recorded yet.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/30 shadow-sm shadow-slate-200/25 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        <table className="w-full text-sm text-left min-w-[520px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 border-b border-slate-200/90 dark:border-slate-700/90">
            <tr>
              <th className="w-10 px-2 py-3" scope="col">
                <span className="sr-only">Details</span>
              </th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">When</th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">BP</th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">Pulse</th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">Temp °C</th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">SpO₂</th>
              <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedRows.map((v) => {
              const open = expandedId === v.id
              return (
                <Fragment key={v.id}>
                  <tr
                    className={`hover:bg-orange-50/40 dark:hover:bg-orange-950/15 transition-colors ${open ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : v.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                        aria-expanded={open}
                        aria-label={open ? 'Hide details' : 'Show details'}
                        title={open ? 'Hide details' : 'Show full notes and record ids'}
                      >
                        {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap text-[13px]">
                      {format(v.recordedAt, 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-800 dark:text-slate-100">{bp(v)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{v.pulse ?? '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                      {v.tempC != null ? v.tempC.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">{v.spo2 != null ? `${v.spo2}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 text-[13px] max-w-[10rem] truncate" title={v.recordedBy}>
                      {v.recordedBy ?? '—'}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/90 dark:bg-slate-900/50">
                      <td colSpan={7} className="px-4 py-4 text-sm border-b border-slate-200/80 dark:border-slate-800">
                        <div className="grid gap-3 sm:grid-cols-3 max-w-3xl">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Entry id</p>
                            <p className="font-mono text-xs text-slate-700 dark:text-slate-200 break-all">{v.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Patient id</p>
                            <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{v.patientId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Recorded by</p>
                            <p className="text-slate-800 dark:text-slate-100 break-words">{v.recordedBy ?? '—'}</p>
                          </div>
                          <div className="sm:col-span-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                            <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                              {v.notes?.trim() ? v.notes : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-3 sm:px-4">
        <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          Showing{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">{rangeStart}</span>
          –
          <span className="font-semibold text-slate-800 dark:text-slate-100">{rangeEnd}</span>
          {' of '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">{total}</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                setPage(1)
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 py-1.5 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Prev
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums px-2 min-w-[6.5rem] text-center">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
