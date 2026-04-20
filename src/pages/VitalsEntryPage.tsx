import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMergeSearchParams } from '../shared/hooks/useMergeSearchParams'
import { Activity, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Search } from 'lucide-react'
import { fetchPatients } from '../shared/api/patientsApi'
import { fetchAllVitals } from '../shared/api/vitalsApi'
import type { PatientRecord } from '../shared/types/patient'
import type { VitalRecord } from '../shared/types/vitals'
import DashboardCard from '../shared/ui/DashboardCard'
import { SearchableIdPicker } from '../shared/ui/SearchWithDropdown'
import { filterLabeledOption } from '../shared/ui/labeledOptionFilter'
import VitalsRecordModal from '../features/vitals/VitalsRecordModal'
import { FieldError, FormInput } from '../shared/ui/form'

// VitalsEntryPage defines the Vitals Entry Page UI surface and its primary interaction flow.
function patientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const
const PAGE_SIZE_ITEMS = PAGE_SIZE_OPTIONS.map((n) => ({ id: String(n), label: String(n) }))

// VitalsEntryPage renders the vitals entry page UI.
function VitalsEntryPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [vitalsByPatient, setVitalsByPatient] = useState<Record<string, VitalRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { searchParams, merge } = useMergeSearchParams()
  const query = searchParams.get('q') ?? ''
  const pageSizeRaw = searchParams.get('size')
  const pageSize: (typeof PAGE_SIZE_OPTIONS)[number] = PAGE_SIZE_OPTIONS.includes(Number(pageSizeRaw) as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (Number(pageSizeRaw) as (typeof PAGE_SIZE_OPTIONS)[number])
    : 10
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [modalPatient, setModalPatient] = useState<PatientRecord | null>(null)
  const [patientDetailId, setPatientDetailId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
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
      setLoadError(e instanceof Error ? e.message : 'Could not load data — is JSON Server running?')
      setPatients([])
      setVitalsByPatient({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

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

  const totalFiltered = filteredPatients.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageRaw = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const safePage = Math.min(pageRaw, totalPages)

  const paginatedPatients = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredPatients.slice(start, start + pageSize)
  }, [filteredPatients, safePage, pageSize])

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, totalFiltered)

  useEffect(() => {
    setPatientDetailId(null)
  }, [safePage, pageSize])

  const refreshAfterSave = async () => {
    void loadAll()
  }

  const openRecordModal = (patient: PatientRecord) => {
    setModalPatient(patient)
    setPatientDetailId(null)
    setEntryModalOpen(true)
  }

  const closeModal = () => {
    setEntryModalOpen(false)
    setModalPatient(null)
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/90 via-white to-white dark:from-orange-950/25 dark:via-slate-900/80 dark:to-slate-900/90 px-5 py-5 sm:px-6 sm:py-6 shadow-sm shadow-orange-200/20 dark:shadow-none ring-1 ring-orange-100/80 dark:ring-orange-950/30">
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-white mb-2">
            Nurse · Vitals
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-600/25">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            Vitals entry
          </h1>
          <p className="text-slate-600 dark:text-white text-sm mt-3 max-w-2xl leading-relaxed">
            <strong className="font-medium text-slate-700 dark:text-white">View</strong> opens charts and history;{' '}
            <strong className="font-medium text-slate-700 dark:text-white">Record</strong> adds vitals. Saved to{' '}
            <code className="text-xs font-mono text-orange-700 dark:text-white">vitals</code>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" aria-hidden />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading patients…</p>
        </div>
      ) : (
        <DashboardCard title="Patients">
          <div className="space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden />
              <FormInput
                value={query}
                onChange={(e) => {
                  if (loadError) setLoadError(null)
                  merge({ q: e.target.value.trim() ? e.target.value : null, page: null })
                }}
                placeholder="Search by name, patient ID, or phone"
                variant="orange"
                className="!pl-10"
                invalid={!!loadError}
                aria-invalid={loadError ? true : undefined}
                aria-describedby={loadError ? 'vitals-entry-load-err' : undefined}
              />
            </div>
            <FieldError id="vitals-entry-load-err" className="!mt-1 max-w-xl">
              {loadError}
            </FieldError>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {totalFiltered} patient{totalFiltered === 1 ? '' : 's'}
              {query.trim()
                ? ` ${totalFiltered === 1 ? 'matches' : 'match'} your search.`
                : '.'}{' '}
              Paginate below. Chevron expands demographics.{' '}
              <strong className="font-medium text-slate-600 dark:text-white">View</strong> /{' '}
              <strong className="font-medium text-slate-600 dark:text-white">Record</strong>.
            </p>
            <div className="space-y-3">
            <div className="max-h-[min(28rem,52vh)] overflow-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/20 ring-1 ring-slate-200/40 dark:ring-slate-800/50">
              {totalFiltered === 0 ? (
                <p className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">No patients match your search.</p>
              ) : (
                <table className="w-full text-sm text-left min-w-[720px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/90 dark:border-slate-700/90 text-slate-600 dark:text-white">
                    <tr>
                      <th className="w-10 px-2 py-3" scope="col">
                        <span className="sr-only">Details</span>
                      </th>
                      <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider" scope="col">
                        Patient
                      </th>
                      <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider" scope="col">
                        ID
                      </th>
                      <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider" scope="col">
                        Last vitals
                      </th>
                      <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider" scope="col">
                        Recorded
                      </th>
                      <th className="px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-right" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedPatients.map((p) => {
                      const last = vitalsByPatient[p.id]?.[0]
                      const detailOpen = patientDetailId === p.id
                      const bpSummary =
                        last && last.systolic != null && last.diastolic != null
                          ? `${last.systolic}/${last.diastolic}`
                          : last?.systolic != null
                            ? `${last.systolic}/—`
                            : last?.diastolic != null
                              ? `—/${last.diastolic}`
                              : '—'
                      return (
                        <Fragment key={p.id}>
                          <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="px-2 py-2 align-middle">
                              <button
                                type="button"
                                onClick={() => setPatientDetailId(detailOpen ? null : p.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-600 text-slate-600 dark:text-white hover:bg-white dark:hover:bg-slate-800"
                                aria-expanded={detailOpen}
                                aria-label={detailOpen ? 'Hide patient details' : 'Show patient details'}
                                title={detailOpen ? 'Hide details' : 'Phone, address, demographics'}
                              >
                                {detailOpen ? (
                                  <ChevronUp className="h-4 w-4" aria-hidden />
                                ) : (
                                  <ChevronDown className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-white">
                                  {patientInitials(p.fullName)}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white truncate">{p.fullName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-sky-700 dark:text-white whitespace-nowrap">
                              {p.id}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-800 dark:text-white tabular-nums">
                              {last ? bpSummary : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-[13px] text-slate-600 dark:text-white whitespace-nowrap">
                              {last
                                ? new Date(last.recordedAt).toLocaleString(undefined, {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <Link
                                  to={`/nurse/vitals/patient/${encodeURIComponent(p.id)}`}
                                  className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                >
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openRecordModal(p)}
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-500 shadow-sm shadow-orange-600/15 transition-colors"
                                >
                                  <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  Record
                                </button>
                              </div>
                            </td>
                          </tr>
                          {detailOpen && (
                            <tr className="bg-slate-50/90 dark:bg-slate-900/55">
                              <td colSpan={6} className="px-4 py-4 text-sm border-b border-slate-200/80 dark:border-slate-800">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Phone</p>
                                    <p className="text-slate-800 dark:text-white">{p.phone || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Email</p>
                                    <p className="text-slate-800 dark:text-white truncate" title={p.email}>
                                      {p.email || '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">DOB / Gender</p>
                                    <p className="text-slate-800 dark:text-white">
                                      {p.dob} · <span className="capitalize">{p.gender}</span>
                                    </p>
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Address</p>
                                    <p className="text-slate-800 dark:text-white leading-relaxed">
                                      {[p.address, p.city, p.state, p.pin].filter(Boolean).join(', ') || '—'}
                                    </p>
                                  </div>
                                  {last && (
                                    <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-950/30 px-3 py-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        Last reading snapshot
                                      </p>
                                      <p className="text-xs text-slate-700 dark:text-white tabular-nums">
                                        BP {bpSummary} · Pulse {last.pulse ?? '—'} · Temp {last.tempC != null ? `${last.tempC.toFixed(1)} °C` : '—'} · SpO₂{' '}
                                        {last.spo2 != null ? `${last.spo2}%` : '—'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {totalFiltered > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-3 sm:px-4">
                <p className="text-xs text-slate-600 dark:text-white tabular-nums">
                  Showing{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">{rangeStart}</span>
                  –
                  <span className="font-semibold text-slate-800 dark:text-white">{rangeEnd}</span>
                  {' of '}
                  <span className="font-semibold text-slate-800 dark:text-white">{totalFiltered}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <SearchableIdPicker<(typeof PAGE_SIZE_ITEMS)[number]>
                    id="vitals-entry-page-size"
                    label="Rows per page"
                    items={PAGE_SIZE_ITEMS}
                    selectedId={String(pageSize)}
                    onSelectId={(id) => merge({ size: id === '10' ? null : id, page: null })}
                    getId={(o) => o.id}
                    getLabel={(o) => o.label}
                    filterItem={filterLabeledOption}
                    placeholder="Rows…"
                    emptyLabel="Rows per page"
                    accent="orange"
                    allowClear={false}
                    className="w-[8.5rem]"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => merge({ page: safePage <= 2 ? null : String(safePage - 1) })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Prev
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-white tabular-nums px-2 min-w-[6.5rem] text-center">
                      Page {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => merge({ page: String(safePage + 1) })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </DashboardCard>
      )}

      <VitalsRecordModal open={entryModalOpen} patient={modalPatient} onClose={closeModal} onSaved={refreshAfterSave} />
    </div>
  )
}

export default VitalsEntryPage
