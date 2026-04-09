import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { PatientRecord } from '../types/patient'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchX,
  UserPlus,
  Users,
} from 'lucide-react'
import { fetchPatients, softDeletePatient } from '../api/patientsApi'
import { notify } from '../lib/notify'
import DashboardCard from '../components/ui/DashboardCard.tsx'
import { SearchFilterCombobox } from '../components/ui/SearchWithDropdown.tsx'

const PAGE_SIZE = 10

const BLOOD_OPTIONS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const selectClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/35 focus:border-sky-400/40 transition-[box-shadow,border-color]'

/** Match API values like "A +" or "o+" to filter option "A+", "O+". */
function normalizeBloodGroup(bg: string): string {
  return bg.replace(/\s+/g, '').toUpperCase()
}

/**
 * Every whitespace-separated token must match at least one field (name, id, email, phone, city, pin).
 * Supports picking "Name + ID" from the combobox and multi-word searches like "Patel MED-2026".
 */
function patientMatchesSearch(p: PatientRecord, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const tokens = q.split(/\s+/).filter(Boolean)
  const phoneCompact = p.phone.replace(/\s/g, '').toLowerCase()
  const phoneDigits = p.phone.replace(/\D/g, '')

  return tokens.every((token) => {
    const t = token.toLowerCase()
    const tokenDigits = t.replace(/\D/g, '')
    if (p.fullName.toLowerCase().includes(t)) return true
    if (p.id.toLowerCase().includes(t)) return true
    if (p.email.toLowerCase().includes(t)) return true
    if (p.city.toLowerCase().includes(t)) return true
    if (p.pin && p.pin.toLowerCase().includes(t)) return true
    if (phoneCompact.includes(t.replace(/\s/g, ''))) return true
    // Only match phone by digit substring when the token is purely numeric; otherwise
    // IDs like MED-SEED-0003 yield tokenDigits "0003" and wrongly match phones e.g. 9800000003.
    if (tokenDigits.length >= 3 && tokenDigits === t && phoneDigits.includes(tokenDigits)) return true
    return false
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

export default function PatientListPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bloodFilter, setBloodFilter] = useState<string>('')
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const location = useLocation()
  const registeredId = (location.state as { registeredId?: string } | null)?.registeredId

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchPatients()
      list.sort((a, b) => b.createdAt - a.createdAt)
      setPatients(list)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load patients. Is JSON Server running? (`npm run server`)'
      setLoadError(msg)
      notify.error(msg)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (bloodFilter && normalizeBloodGroup(p.bloodGroup) !== normalizeBloodGroup(bloodFilter)) return false
      if (genderFilter && p.gender.trim().toLowerCase() !== genderFilter) return false
      return patientMatchesSearch(p, searchQuery)
    })
  }, [patients, searchQuery, bloodFilter, genderFilter])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, bloodFilter, genderFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  const activeFilters = Boolean(searchQuery.trim() || bloodFilter || genderFilter)

  const deactivate = async (p: PatientRecord) => {
    if (!window.confirm(`Soft-delete (deactivate) patient ${p.fullName} (${p.id})? They will be hidden from this list.`)) {
      return
    }
    try {
      await softDeletePatient(p.id)
      notify.success(`${p.fullName} deactivated`)
      await load()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not deactivate patient')
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/60 dark:border-sky-900/40 bg-gradient-to-br from-sky-50/95 via-white to-white dark:from-sky-950/30 dark:via-slate-900/85 dark:to-slate-900/90 px-5 py-5 sm:px-6 sm:py-6 shadow-sm shadow-sky-200/25 dark:shadow-none ring-1 ring-sky-100/80 dark:ring-sky-950/35">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/30">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-1">
                Registry
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Patients
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
                Search, filter, and manage records. Data syncs with JSON Server when{' '}
                <code className="text-xs font-mono text-sky-700 dark:text-sky-300/90">npm run server</code> is running.
              </p>
            </div>
          </div>
          <Link
            to="/admin/patients/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-md shadow-sky-600/25 transition-colors shrink-0"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Register patient
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-5 py-4 text-sm font-medium text-amber-950 dark:text-amber-200 ring-1 ring-amber-200/50 dark:ring-amber-500/20">
          {loadError}
        </div>
      )}

      {registeredId && (
        <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-5 py-4 text-sm font-medium text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-200/50 dark:ring-emerald-500/20 flex flex-wrap items-center gap-2">
          <span>Patient registered successfully.</span>
          <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-100">{registeredId}</span>
          <Link
            to={`/admin/patients/${encodeURIComponent(registeredId)}`}
            className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Open profile
          </Link>
        </div>
      )}

      {/* Quick stats */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{patients.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Showing</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 tabular-nums mt-0.5">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40 col-span-2 sm:col-span-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filters</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {activeFilters ? 'Refining list' : 'None applied'}
              </p>
            </div>
            {activeFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setBloodFilter('')
                  setGenderFilter('')
                }}
                className="shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <DashboardCard title="Search & filters" className="relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
          <div className="lg:col-span-2 min-w-0 w-full">
            <SearchFilterCombobox<PatientRecord>
              id="patient-registry-search"
              label="Search"
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={patients}
              getKey={(p) => p.id}
              filterItem={(p, q) => patientMatchesSearch(p, q)}
              renderSuggestion={(p) => (
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/50 text-[11px] font-bold text-sky-800 dark:text-sky-200">
                    {initials(p.fullName)}
                  </span>
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white block">{p.fullName}</span>
                    <span className="text-xs font-mono text-sky-600 dark:text-sky-400">{p.id}</span>
                  </span>
                </span>
              )}
              onPick={(p) => setSearchQuery(p.id)}
              placeholder="Name, phone, email, or patient ID"
              accent="sky"
              hint="Pick a suggestion or keep typing to narrow the table."
            />
          </div>
          <div>
            <label
              htmlFor="patient-blood-filter"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Blood group
            </label>
            <select
              id="patient-blood-filter"
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All groups</option>
              {BLOOD_OPTIONS.filter(Boolean).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="patient-gender-filter"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Gender
            </label>
            <select
              id="patient-gender-filter"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        {!loading && patients.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
            </span>
            –
            <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="font-semibold tabular-nums">{filtered.length}</span>
            {filtered.length !== patients.length && (
              <span className="text-slate-400 dark:text-slate-500"> (from {patients.length} total)</span>
            )}
          </p>
        )}
      </DashboardCard>

      <DashboardCard title="Patient directory" className="relative z-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-sky-500" aria-hidden />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading patients…</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14 px-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ring-1 ring-slate-200 dark:ring-slate-700">
              <Users className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold">No patients yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Register your first patient to populate this list.
            </p>
            <Link
              to="/admin/patients/new"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              Register patient
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14 px-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ring-1 ring-slate-200 dark:ring-slate-700">
              <SearchX className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold">No matches</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Try clearing filters or adjusting your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setBloodFilter('')
                setGenderFilter('')
              }}
              className="mt-5 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="-mx-5 border-t border-slate-100 dark:border-slate-800">
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[720px] text-sm text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/90 dark:border-slate-700/90">
                    <tr className="text-slate-600 dark:text-slate-400">
                      <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider w-12" />
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">Patient ID</th>
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">Name</th>
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">Phone</th>
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">Gender</th>
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">Blood</th>
                      <th className="px-2 sm:px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider">City</th>
                      <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/90">
                    {pageSlice.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors"
                      >
                        <td className="px-4 sm:px-5 py-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/60 dark:to-slate-800 text-xs font-bold text-sky-800 dark:text-sky-200 ring-1 ring-sky-200/60 dark:ring-sky-900/40">
                            {initials(p.fullName)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 font-mono text-xs font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {p.id}
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                          {p.phone}
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="inline-flex capitalize px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {p.gender}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-1 ring-rose-200/50 dark:ring-rose-900/40">
                            {p.bloodGroup}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 text-slate-600 dark:text-slate-300">{p.city}</td>
                        <td className="px-4 sm:px-5 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                            <Link
                              to={`/admin/patients/${encodeURIComponent(p.id)}`}
                              className="inline-flex px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
                            >
                              View
                            </Link>
                            <Link
                              to={`/admin/patients/${encodeURIComponent(p.id)}/edit`}
                              className="inline-flex px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => void deactivate(p)}
                              className="inline-flex px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between -mx-5 px-5 py-4 mt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((pg) => Math.max(1, pg - 1))}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 tabular-nums text-center">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((pg) => Math.min(totalPages, pg + 1))}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </DashboardCard>
    </div>
  )
}
