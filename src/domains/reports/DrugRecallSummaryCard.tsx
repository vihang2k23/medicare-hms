import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, Loader2, RefreshCw } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DashboardCard from '../../components/ui/DashboardCard'
import { fetchRecallCountsByDrugClass } from '../../utils/openfdaEnforcementApi'
import { downloadCsv } from '../../utils/csvExport'

// DrugRecallSummaryCard defines the Drug Recall Summary Card UI surface and its primary interaction flow.
const BAR_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b', '#ec4899']

const DEMO_RECALL_BY_CLASS = [
  { name: 'Anti-inflammatory agents, NSAID', count: 18 },
  { name: 'Antibiotic', count: 14 },
  { name: 'Cardiovascular agents', count: 11 },
  { name: 'Analgesic', count: 9 },
  { name: 'Opioid agonist', count: 7 },
  { name: 'Antidiabetic', count: 6 },
]

interface DrugRecallSummaryCardProps {
  /** Optional actions in the card header (e.g. print this chart). */
  cardActions?: ReactNode
}

// DrugRecallSummaryCard renders the drug recall summary card UI.
export default function DrugRecallSummaryCard({ cardActions }: DrugRecallSummaryCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<{ name: string; count: number }[]>([])

  const applyResult = useCallback((byClass: { name: string; count: number }[], apiError: string | null | undefined) => {
    if (apiError || byClass.length === 0) {
      setRows(DEMO_RECALL_BY_CLASS)
      if (apiError) setError(apiError)
    } else {
      setRows(byClass.slice(0, 12))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { byClass, error: apiError } = await fetchRecallCountsByDrugClass({ limit: 200 })
      if (cancelled) return
      applyResult(byClass, apiError)
    })()
    return () => {
      cancelled = true
    }
  }, [applyResult])

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    void (async () => {
      const { byClass, error: apiError } = await fetchRecallCountsByDrugClass({ limit: 200 })
      applyResult(byClass, apiError)
    })()
  }, [applyResult])

  const exportRecallCsv = useCallback(() => {
    if (rows.length === 0) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    const out: string[][] = [
      ['MediCare HMS — drug recall by class (OpenFDA / demo)'],
      ['Generated', generated],
      ...(error ? [['API note', error]] : []),
      [],
      ['Drug class', 'Recall count (sample)'],
      ...rows.map((r) => [r.name, String(r.count)]),
    ]
    downloadCsv(`medicare-hms-drug-recall-openfda-${stamp}.csv`, out)
  }, [rows, error])

  return (
    <DashboardCard title="Drug recall summary (OpenFDA enforcement)" actions={cardActions}>
      <div className="no-print-report flex flex-wrap items-center justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={exportRecallCsv}
          disabled={loading || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          title="Download recall-by-class data as CSV"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          CSV
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          Refresh
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-white mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <div className="report-chart-host h-80">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-white text-sm gap-2">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading OpenFDA…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-white py-16 text-center">No recall rows to chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="#64748b" />
              <YAxis
                type="category"
                dataKey="name"
                width={200}
                tick={{ fontSize: 9 }}
                stroke="#64748b"
                interval={0}
              />
              <Tooltip formatter={(v: unknown) => [`${Number(v)} recalls (in sample)`, 'Count']} />
              <Bar dataKey="count" name="Recalls" radius={[0, 4, 4, 0]}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  )
}
