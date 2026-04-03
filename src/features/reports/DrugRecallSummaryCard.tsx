import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DashboardCard from '../../components/ui/DashboardCard'
import { fetchRecallCountsByDrugClass } from '../../lib/openfdaEnforcementApi'

const BAR_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b', '#ec4899']

/** In-app sample so the chart always renders if OpenFDA is empty or unreachable. */
const DEMO_RECALL_BY_CLASS = [
  { name: 'Anti-inflammatory agents, NSAID', count: 18 },
  { name: 'Antibiotic', count: 14 },
  { name: 'Cardiovascular agents', count: 11 },
  { name: 'Analgesic', count: 9 },
  { name: 'Opioid agonist', count: 7 },
  { name: 'Antidiabetic', count: 6 },
]

export default function DrugRecallSummaryCard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<{ name: string; count: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { byClass, error: apiError } = await fetchRecallCountsByDrugClass({ limit: 200 })
    if (apiError || byClass.length === 0) {
      setRows(DEMO_RECALL_BY_CLASS)
      if (apiError) setError(apiError)
    } else {
      setRows(byClass.slice(0, 12))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <DashboardCard title="Drug recall summary (OpenFDA enforcement)">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          Refresh
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <div className="h-80">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm gap-2">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading OpenFDA…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-16 text-center">No recall rows to chart.</p>
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
