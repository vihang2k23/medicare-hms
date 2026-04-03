import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Heart, Loader2, Search, Thermometer, Wind } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { fetchPatients } from '../api/patientsApi'
import { createVital, fetchAllVitals, fetchVitalsByPatientId } from '../api/vitalsApi'
import type { PatientRecord } from '../types/patient'
import type { VitalRecord } from '../types/vitals'
import { notify } from '../lib/notify'
import DashboardCard from '../components/ui/DashboardCard'
import VitalsHistoryList from '../components/vitals/VitalsHistoryList'

const VitalsTrendCharts = lazy(() => import('../components/vitals/VitalsTrendCharts'))

function parseOptInt(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : undefined
}

function parseOptFloat(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function patientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

const fieldInput =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm shadow-slate-200/20 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400/50 transition-[box-shadow,border-color]'

function VitalsEntryPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [vitalsByPatient, setVitalsByPatient] = useState<Record<string, VitalRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<VitalRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [temp, setTemp] = useState('')
  const [spo2, setSpo2] = useState('')
  const [notes, setNotes] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [plist, vlist] = await Promise.all([fetchPatients(), fetchAllVitals()])
      setPatients(plist)
      const map: Record<string, VitalRecord[]> = {}
      for (const v of vlist) {
        if (!map[v.patientId]) map[v.patientId] = []
        map[v.patientId]!.push(v)
      }
      for (const k of Object.keys(map)) {
        map[k]!.sort((a, b) => b.recordedAt - a.recordedAt)
      }
      setVitalsByPatient(map)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not load data — is JSON Server running?')
      setPatients([])
      setVitalsByPatient({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const selected = useMemo(
    () => (selectedId ? patients.find((p) => p.id === selectedId) ?? null : null),
    [patients, selectedId],
  )

  useEffect(() => {
    if (!selectedId) {
      setHistory([])
      return
    }
    let cancelled = false
    setHistoryLoading(true)
    void (async () => {
      try {
        const rows = await fetchVitalsByPatientId(selectedId)
        if (!cancelled) setHistory(rows)
      } catch {
        if (!cancelled) setHistory([])
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
    )
  }, [patients, query])

  const resetForm = () => {
    setSys('')
    setDia('')
    setPulse('')
    setTemp('')
    setSpo2('')
    setNotes('')
  }

  const submit = async () => {
    if (!selectedId) return
    const systolic = parseOptInt(sys)
    const diastolic = parseOptInt(dia)
    const pulseN = parseOptInt(pulse)
    const tempN = parseOptFloat(temp)
    const spo2N = parseOptInt(spo2)

    const hasAny =
      systolic != null ||
      diastolic != null ||
      pulseN != null ||
      tempN != null ||
      spo2N != null ||
      notes.trim().length > 0
    if (!hasAny) {
      notify.error('Enter at least one vital sign or a note.')
      return
    }

    setSaving(true)
    try {
      await createVital({
        patientId: selectedId,
        systolic,
        diastolic,
        pulse: pulseN,
        tempC: tempN,
        spo2: spo2N,
        notes: notes.trim() || undefined,
        recordedBy: user?.name,
      })
      notify.success('Vitals saved')
      resetForm()
      const rows = await fetchVitalsByPatientId(selectedId)
      setHistory(rows)
      void loadAll()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/90 via-white to-white dark:from-orange-950/25 dark:via-slate-900/80 dark:to-slate-900/90 px-5 py-5 sm:px-6 sm:py-6 shadow-sm shadow-orange-200/20 dark:shadow-none ring-1 ring-orange-100/80 dark:ring-orange-950/30">
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 mb-2">
            Nurse · Vitals
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-600/25">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            Vitals entry
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 max-w-2xl leading-relaxed">
            Select a patient, enter readings, and save. Vitals sync to the local server (
            <code className="text-xs font-mono text-orange-700 dark:text-orange-300/90">vitals</code>
            ).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" aria-hidden />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading patients and history…</p>
        </div>
      ) : (
        <div className="space-y-6 lg:space-y-8">
          <nav
            className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400"
            aria-label="Vitals workflow"
          >
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
                selectedId
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50'
                  : 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/50'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/50 text-[11px] tabular-nums">
                1
              </span>
              Patient
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden>
              →
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
                !selectedId
                  ? 'opacity-50 ring-slate-200 dark:ring-slate-700'
                  : 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/50 text-[11px] tabular-nums">
                2
              </span>
              Vitals
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden>
              →
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${
                !selectedId
                  ? 'opacity-50 ring-slate-200 dark:ring-slate-700'
                  : 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/50 text-[11px] tabular-nums">
                3
              </span>
              Review
            </span>
          </nav>

          {/* Step 1 — full width */}
          <DashboardCard title="1 · Select patient">
            <div className="space-y-4">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, patient ID, or phone"
                  className={`${fieldInput} pl-10`}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredPatients.length} patient{filteredPatients.length === 1 ? '' : 's'} shown
                {query.trim() ? ' (filtered)' : ''}.
              </p>
              <div className="max-h-[min(20rem,42vh)] sm:max-h-[min(22rem,48vh)] overflow-y-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/40 dark:bg-slate-950/25 p-2 sm:p-3">
                {filteredPatients.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No patients match your search.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    {filteredPatients.map((p) => {
                      const last = vitalsByPatient[p.id]?.[0]
                      const active = selectedId === p.id
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(p.id)
                              resetForm()
                            }}
                            className={`w-full text-left rounded-xl border p-3 sm:p-3.5 flex gap-3 items-start transition-all min-h-[4.5rem] ${
                              active
                                ? 'border-orange-400 bg-orange-50/90 shadow-sm shadow-orange-200/30 dark:border-orange-700 dark:bg-orange-950/40 dark:shadow-none ring-2 ring-orange-400/30'
                                : 'border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/40 hover:border-orange-200 dark:hover:border-orange-900/60'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                active
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200'
                              }`}
                            >
                              {patientInitials(p.fullName)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                                {p.fullName}
                              </span>
                              <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 block truncate mt-0.5">{p.id}</span>
                              {last && (
                                <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                                  Last{' '}
                                  {last.systolic != null && last.diastolic != null ? `${last.systolic}/${last.diastolic}` : '—'} ·{' '}
                                  {new Date(last.recordedAt).toLocaleString(undefined, {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </DashboardCard>

          {/* Step 2 — form only */}
          <DashboardCard title="2 · Enter vitals">
            {!selected ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2 sm:py-4 text-center sm:text-left">
                <div className="mx-auto sm:mx-0 h-14 w-14 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
                  <Activity className="h-7 w-7 text-slate-400" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select a patient in step 1</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                    The form unlocks after you choose who you are recording for.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/90 dark:border-slate-700/90">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recording for</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{selected.fullName}</h2>
                    <p className="text-xs font-mono text-sky-600 dark:text-sky-400">{selected.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null)
                      resetForm()
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 underline-offset-2 hover:underline"
                  >
                    Change patient
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/25 p-4 space-y-3">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" strokeWidth={2.5} aria-hidden />
                        Blood pressure
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Systolic</label>
                          <input
                            inputMode="numeric"
                            value={sys}
                            onChange={(e) => setSys(e.target.value)}
                            placeholder="mmHg"
                            className={fieldInput}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Diastolic</label>
                          <input
                            inputMode="numeric"
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                            placeholder="mmHg"
                            className={fieldInput}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/25 p-4 space-y-3">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Wind className="h-3.5 w-3.5 text-sky-500 shrink-0" strokeWidth={2.5} aria-hidden />
                          <Thermometer className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} aria-hidden />
                        </span>
                        Pulse, temperature &amp; oxygen
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Pulse</label>
                          <input
                            inputMode="numeric"
                            value={pulse}
                            onChange={(e) => setPulse(e.target.value)}
                            placeholder="bpm"
                            className={fieldInput}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Temp °C</label>
                          <input
                            inputMode="decimal"
                            value={temp}
                            onChange={(e) => setTemp(e.target.value)}
                            placeholder="36.8"
                            className={fieldInput}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">SpO₂ %</label>
                          <input
                            inputMode="numeric"
                            value={spo2}
                            onChange={(e) => setSpo2(e.target.value)}
                            placeholder="98"
                            className={fieldInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        placeholder="Optional context for the care team"
                        className={`${fieldInput} resize-y min-h-[8rem] lg:min-h-[10rem]`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={saving}
                      className="w-full px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-md shadow-orange-600/25 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save vitals'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* Step 3 — charts + table (own card) */}
          <DashboardCard title="3 · Trends & history">
            {!selected ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                Choose a patient in step 1 to load charts and the vitals log.
              </p>
            ) : historyLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14">
                <Loader2 className="h-9 w-9 animate-spin text-orange-500" aria-hidden />
                <span className="text-xs text-slate-500 dark:text-slate-400">Loading history…</span>
              </div>
            ) : (
              <div className="space-y-8">
                {history.length > 0 && (
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center gap-2 py-12 rounded-xl bg-slate-50/80 dark:bg-slate-800/30">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Loading charts…</span>
                      </div>
                    }
                  >
                    <VitalsTrendCharts rows={history} />
                  </Suspense>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200/90 dark:border-slate-700/90">
                    Full history
                  </h3>
                  <VitalsHistoryList rows={history} />
                </div>
              </div>
            )}
          </DashboardCard>
        </div>
      )}
    </div>
  )
}

export default VitalsEntryPage
