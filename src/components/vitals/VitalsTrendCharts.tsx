import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { format } from 'date-fns'
import { Activity, LineChart as LineChartIcon } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RootState } from '../../app/store'
import type { VitalRecord } from '../../types/vitals'

type ChartRow = {
  label: string
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  tempC: number | null
  spo2: number | null
}

function toChartRows(rows: VitalRecord[]): ChartRow[] {
  return [...rows]
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .map((v) => ({
      label: format(v.recordedAt, 'MMM d, HH:mm'),
      systolic: v.systolic ?? null,
      diastolic: v.diastolic ?? null,
      pulse: v.pulse ?? null,
      tempC: v.tempC ?? null,
      spo2: v.spo2 ?? null,
    }))
}

function countNumeric(data: ChartRow[], key: keyof ChartRow): number {
  return data.filter((d) => typeof d[key] === 'number' && d[key] !== null).length
}

export default function VitalsTrendCharts({ rows }: { rows: VitalRecord[] }) {
  const theme = useSelector((s: RootState) => s.ui.theme)
  const dark = theme === 'dark'
  const axis = dark ? '#94a3b8' : '#64748b'
  const grid = dark ? '#334155' : '#e2e8f0'
  const tipBg = dark ? '#1e293b' : '#ffffff'
  const tipBorder = dark ? '#475569' : '#e2e8f0'

  const data = useMemo(() => toChartRows(rows), [rows])
  const latest = rows.length > 0 ? [...rows].sort((a, b) => b.recordedAt - a.recordedAt)[0] : null

  const bpN = useMemo(
    () => data.filter((d) => d.systolic != null || d.diastolic != null).length,
    [data],
  )
  const pulseN = countNumeric(data, 'pulse')
  const tempN = countNumeric(data, 'tempC')
  const spo2N = countNumeric(data, 'spo2')

  if (rows.length === 0) {
    return null
  }

  const tooltipStyle = {
    backgroundColor: tipBg,
    border: `1px solid ${tipBorder}`,
    borderRadius: 8,
    fontSize: 12,
  }

  const chartMargin = { top: 10, right: 10, left: 4, bottom: 28 }

  return (
    <div className="space-y-6 print:break-inside-avoid">
      {latest && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-orange-500" aria-hidden />
            Latest reading
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {latest.systolic != null && latest.diastolic != null && (
              <div className="rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/30 dark:to-slate-900/50 px-3 py-2.5 shadow-sm shadow-rose-100/40 dark:shadow-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90">BP</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {latest.systolic}/{latest.diastolic}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">mmHg</p>
              </div>
            )}
            {latest.pulse != null && (
              <div className="rounded-xl border border-orange-200/70 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/90 to-white dark:from-orange-950/30 dark:to-slate-900/50 px-3 py-2.5 shadow-sm shadow-orange-100/40 dark:shadow-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600/90 dark:text-orange-400/90">Pulse</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{latest.pulse}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">bpm</p>
              </div>
            )}
            {latest.tempC != null && (
              <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/30 dark:to-slate-900/50 px-3 py-2.5 shadow-sm shadow-emerald-100/40 dark:shadow-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">Temp</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{latest.tempC.toFixed(1)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">°C</p>
              </div>
            )}
            {latest.spo2 != null && (
              <div className="rounded-xl border border-sky-200/70 dark:border-sky-900/40 bg-gradient-to-br from-sky-50/90 to-white dark:from-sky-950/30 dark:to-slate-900/50 px-3 py-2.5 shadow-sm shadow-sky-100/40 dark:shadow-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600/90 dark:text-sky-400/90">SpO₂</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{latest.spo2}%</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">saturation</p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            {format(latest.recordedAt, 'PPp')}
            {latest.recordedBy ? ` · ${latest.recordedBy}` : ''}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-3 sm:px-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
          Trends over time
        </h3>
        {data.length < 2 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Add at least two vitals entries on different times to unlock line charts.
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Chronological order. Each chart needs two or more readings for that measurement.
          </p>
        )}
      </div>

      {data.length >= 2 && bpN >= 2 && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/40 shadow-md shadow-slate-200/30 dark:shadow-none overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Blood pressure (mmHg)</h4>
          </div>
          <div className="p-3 sm:p-4">
            <div className="h-[240px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: axis }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: grid }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: axis }} domain={['auto', 'auto']} width={44} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {(pulseN >= 2 || spo2N >= 2) && data.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pulseN >= 2 && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/40 shadow-md shadow-slate-200/30 dark:shadow-none overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Pulse (bpm)</h4>
              </div>
              <div className="p-3 sm:p-4">
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: axis }}
                        tickMargin={10}
                        interval="preserveStartEnd"
                        axisLine={{ stroke: grid }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: axis }} domain={['auto', 'auto']} width={44} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="pulse" name="Pulse" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          {spo2N >= 2 && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/40 shadow-md shadow-slate-200/30 dark:shadow-none overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">SpO₂ (%)</h4>
              </div>
              <div className="p-3 sm:p-4">
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: axis }}
                        tickMargin={10}
                        interval="preserveStartEnd"
                        axisLine={{ stroke: grid }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: axis }} domain={[85, 100]} width={44} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {data.length >= 2 && tempN >= 2 && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/40 shadow-md shadow-slate-200/30 dark:shadow-none overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-900/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Temperature (°C)</h4>
          </div>
          <div className="p-3 sm:p-4">
            <div className="h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: axis }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: grid }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: axis }} domain={['auto', 'auto']} width={44} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="tempC" name="Temperature" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {data.length >= 2 && bpN < 2 && pulseN < 2 && spo2N < 2 && tempN < 2 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
          Repeat the same type of measurement on another visit (for example BP twice) to see a trend line.
        </p>
      )}
    </div>
  )
}
