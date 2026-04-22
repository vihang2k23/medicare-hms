import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMergeSearchParams } from '../hooks/useMergeSearchParams'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import type { Appointment } from '../domains/appointments/types'
import type { PatientRecord } from '../types/patient'
import {
  Building2,
  Cake,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Eye,
  Filter,
  ListFilter,
  Loader2,
  Pencil,
  PersonStanding,
  SearchX,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { fetchPatients, softDeletePatient } from '../services/patientsApi'
import { notify } from '../utils/helpers'
import { FieldError, FormInput } from '../components/ui/form'
import DashboardCard from '../components/ui/DashboardCard'
import { SearchFilterCombobox, SearchableIdPicker } from '../components/ui/SearchWithDropdown'
import { filterLabeledOption } from '../utils/helpers'
import { isoDateLocalToday } from '../domains/patients/patientSchemas'
import { clearPatientRegistrationDraft } from '../domains/patients/patientRegistrationStorage'
import { LUCIDE_STROKE_FIELD } from '../utils/helpers'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const PAGE_SIZE = 10

const BLOOD_OPTIONS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

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

function patientAgeYears(dob: string): number | null {
  const t = Date.parse(dob)
  if (Number.isNaN(t)) return null
  const birth = new Date(t)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const md = now.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function departmentsForPatient(patientId: string, appointments: Appointment[]): string[] {
  const s = new Set<string>()
  for (const a of appointments) {
    if (a.patientId === patientId && a.department?.trim()) s.add(a.department.trim())
  }
  return [...s]
}

function regRangeStartMs(isoDate: string): number | null {
  const q = isoDate.trim()
  if (!q) return null
  const d = new Date(`${q}T00:00:00`)
  const x = d.getTime()
  return Number.isNaN(x) ? null : x
}

function regRangeEndMs(isoDate: string): number | null {
  const q = isoDate.trim()
  if (!q) return null
  const d = new Date(`${q}T23:59:59.999`)
  const x = d.getTime()
  return Number.isNaN(x) ? null : x
}

const AGE_FILTER_MAX = 130

/** URL param value: empty, invalid, or negative → null; otherwise clamped 0…AGE_FILTER_MAX. */
function sanitizeAgeFilterParam(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return String(Math.min(AGE_FILTER_MAX, Math.max(0, Math.floor(n))))
}

function blockNegativeNumberKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault()
  }
}

// PatientListPage renders the patient list page UI.
export default function PatientListPage() {
  useEffect(() => {
    clearPatientRegistrationDraft()
  }, [])
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { searchParams, merge } = useMergeSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const bloodFilter = searchParams.get('blood') ?? ''
  const genderFilter = searchParams.get('gender') ?? ''
  const ageMin = searchParams.get('ageMin') ?? ''
  const ageMax = searchParams.get('ageMax') ?? ''
  const regFrom = searchParams.get('regFrom') ?? ''
  const regTo = searchParams.get('regTo') ?? ''
  const departmentFilter = searchParams.get('dept') ?? ''
  const location = useLocation()
  const registeredId = (location.state as { registeredId?: string } | null)?.registeredId
  const [deactivateTarget, setDeactivateTarget] = useState<PatientRecord | null>(null)
  const [deactivateBusy, setDeactivateBusy] = useState(false)

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
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const departmentOptions = useMemo(() => {
    const s = new Set<string>()
    for (const a of appointments) {
      const d = a.department?.trim()
      if (d) s.add(d)
    }
    return [...s].sort((x, y) => x.localeCompare(y))
  }, [appointments])

  const bloodFilterItems = useMemo(
    () => [
      { id: '', label: 'All groups' },
      ...BLOOD_OPTIONS.filter(Boolean).map((b) => ({ id: b, label: b })),
    ],
    [],
  )

  const genderFilterItems = useMemo(
    () => [
      { id: '', label: 'All' },
      { id: 'male', label: 'Male' },
      { id: 'female', label: 'Female' },
      { id: 'other', label: 'Other' },
    ],
    [],
  )

  const departmentFilterItems = useMemo(
    () => [{ id: '', label: 'All departments' }, ...departmentOptions.map((d) => ({ id: d, label: d }))],
    [departmentOptions],
  )

  const filtered = useMemo(() => {
    const fromMs = regRangeStartMs(regFrom)
    const toMs = regRangeEndMs(regTo)
    return patients.filter((p) => {
      if (bloodFilter && normalizeBloodGroup(p.bloodGroup) !== normalizeBloodGroup(bloodFilter)) return false
      if (genderFilter && p.gender.trim().toLowerCase() !== genderFilter) return false
      if (fromMs !== null && p.createdAt < fromMs) return false
      if (toMs !== null && p.createdAt > toMs) return false

      const age = patientAgeYears(p.dob)
      if (ageMin.trim()) {
        const lo = Number(ageMin)
        if (!Number.isNaN(lo)) {
          if (age === null) return false
          if (age < lo) return false
        }
      }
      if (ageMax.trim()) {
        const hi = Number(ageMax)
        if (!Number.isNaN(hi)) {
          if (age === null) return false
          if (age > hi) return false
        }
      }

      if (departmentFilter && !departmentsForPatient(p.id, appointments).includes(departmentFilter)) return false

      return patientMatchesSearch(p, searchQuery)
    })
  }, [
    patients,
    searchQuery,
    bloodFilter,
    genderFilter,
    ageMin,
    ageMax,
    regFrom,
    regTo,
    departmentFilter,
    appointments,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRaw = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const safePage = Math.min(pageRaw, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  const activeFilters = Boolean(
    searchQuery.trim() ||
      bloodFilter ||
      genderFilter ||
      ageMin.trim() ||
      ageMax.trim() ||
      regFrom.trim() ||
      regTo.trim() ||
      departmentFilter,
  )

  const ageRangeFilterError = useMemo(() => {
    if (!ageMin.trim() || !ageMax.trim()) return null
    const lo = Number(ageMin)
    const hi = Number(ageMax)
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null
    if (lo > hi) return 'Min age cannot be greater than max age.'
    return null
  }, [ageMin, ageMax])

  const regRangeFilterError = useMemo(() => {
    if (!regFrom.trim() || !regTo.trim()) return null
    if (regFrom > regTo) return '"Registered from" must be on or before "registered to".'
    return null
  }, [regFrom, regTo])

  const todayStr = useMemo(() => isoDateLocalToday(), [])

  /** "From" cannot be after "to" or after today. */
  const regFromMax = useMemo(() => {
    if (!regTo.trim()) return todayStr
    return regTo < todayStr ? regTo : todayStr
  }, [regTo, todayStr])

  const regToMin = regFrom.trim() || undefined

  useEffect(() => {
    if (!regFrom.trim() || !regTo.trim()) return
    if (regFrom > regTo) {
      merge({ regTo: regFrom, page: null })
    }
  }, [regFrom, regTo, merge])

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivateBusy(true)
    try {
      await softDeletePatient(deactivateTarget.id)
      notify.success(`${deactivateTarget.fullName} deactivated`)
      setDeactivateTarget(null)
      await load()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not deactivate patient')
    } finally {
      setDeactivateBusy(false)
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
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-white mb-1">
                Registry
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Patients
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
                Search, filter, and manage records. Data syncs with JSON Server when{' '}
                <code className="text-xs font-mono text-sky-700 dark:text-sky-300">npm run server</code> is running.
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

      {registeredId && (
        <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-5 py-4 text-sm font-medium text-emerald-900 dark:text-white ring-1 ring-emerald-200/50 dark:ring-emerald-500/20 flex flex-wrap items-center gap-2">
          <span>Patient registered successfully.</span>
          <span className="font-mono font-semibold text-emerald-800 dark:text-white">{registeredId}</span>
          <Link
            to={`/admin/patients/${encodeURIComponent(registeredId)}`}
            className="text-sm font-semibold text-emerald-700 dark:text-white hover:underline"
          >
            Open profile
          </Link>
        </div>
      )}

      {/* Quick stats */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40 flex gap-3 items-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-600/60">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{patients.length}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40 flex gap-3 items-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 ring-1 ring-sky-200/70 dark:ring-sky-900/50">
              <UserCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Showing</p>
              <p className="text-2xl font-bold text-sky-700 dark:text-white tabular-nums mt-0.5">{filtered.length}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/50 px-4 py-3 ring-1 ring-slate-200/40 dark:ring-slate-700/40 col-span-2 sm:col-span-2 flex items-center justify-between gap-3">
            <div className="flex gap-3 items-start min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/35 text-violet-600 dark:text-violet-300 ring-1 ring-violet-200/70 dark:ring-violet-900/45">
                <Filter className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Filters</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {activeFilters ? 'Refining list' : 'None applied'}
                </p>
              </div>
            </div>
            {activeFilters && (
              <button
                type="button"
                onClick={() => {
                  setLoadError(null)
                  merge({
                    q: null,
                    blood: null,
                    gender: null,
                    ageMin: null,
                    ageMax: null,
                    regFrom: null,
                    regTo: null,
                    dept: null,
                    page: null,
                  })
                }}
                className="shrink-0 text-xs font-semibold text-sky-600 dark:text-white hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <DashboardCard
        title={
          <span className="inline-flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
            Search &amp; filters
          </span>
        }
        className="relative z-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
          <div className="lg:col-span-2 min-w-0 w-full">
            <SearchFilterCombobox<PatientRecord>
              id="patient-registry-search"
              label="Search"
              value={searchQuery}
              onChange={(v) => {
                if (loadError) setLoadError(null)
                merge({ q: v.trim() ? v : null, page: null })
              }}
              suggestions={patients}
              getKey={(p) => p.id}
              filterItem={(p, q) => patientMatchesSearch(p, q)}
              renderSuggestion={(p) => (
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/50 text-[11px] font-bold text-sky-800 dark:text-white">
                    {initials(p.fullName)}
                  </span>
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white block">{p.fullName}</span>
                    <span className="text-xs font-mono text-sky-600 dark:text-white">{p.id}</span>
                  </span>
                </span>
              )}
              onPick={(p) => {
                if (loadError) setLoadError(null)
                merge({ q: p.id, page: null })
              }}
              placeholder="Name, phone, email, or patient ID"
              accent="sky"
              hint="Pick a suggestion or keep typing to narrow the table."
            />
            <FieldError id="patient-list-load-err" className="!mt-1">
              {loadError}
            </FieldError>
          </div>
          <div>
            <SearchableIdPicker<{ id: string; label: string }>
              id="patient-blood-filter"
              label="Blood group"
              inputLeadingIcon={Droplet}
              items={bloodFilterItems}
              selectedId={bloodFilter}
              onSelectId={(id) => merge({ blood: id || null, page: null })}
              getId={(o) => o.id}
              getLabel={(o) => o.label}
              filterItem={filterLabeledOption}
              placeholder="Search blood group…"
              emptyLabel="All groups"
              accent="sky"
              className="w-full"
            />
          </div>
          <div>
            <SearchableIdPicker<{ id: string; label: string }>
              id="patient-gender-filter"
              label="Gender"
              inputLeadingIcon={PersonStanding}
              items={genderFilterItems}
              selectedId={genderFilter}
              onSelectId={(id) => merge({ gender: id || null, page: null })}
              getId={(o) => o.id}
              getLabel={(o) => o.label}
              filterItem={filterLabeledOption}
              placeholder="Search gender…"
              emptyLabel="All"
              accent="sky"
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5 items-start">
          <div>
            <label
              htmlFor="patient-age-min"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5"
            >
              Min age
            </label>
            <div className="relative">
              <Cake
                className={`absolute left-3 top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 pointer-events-none ${LUCIDE_STROKE_FIELD}`}
                strokeWidth={2.5}
                aria-hidden
              />
              <FormInput
                id="patient-age-min"
                type="number"
                min={0}
                max={AGE_FILTER_MAX}
                step={1}
                inputMode="numeric"
                placeholder="Any"
                value={ageMin}
                onKeyDown={blockNegativeNumberKeys}
                onChange={(e) => merge({ ageMin: sanitizeAgeFilterParam(e.target.value), page: null })}
                invalid={!!ageRangeFilterError}
                aria-invalid={ageRangeFilterError ? true : undefined}
                aria-describedby={ageRangeFilterError ? 'patient-list-age-range-err' : undefined}
                className="relative z-10 pl-10"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="patient-age-max"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5"
            >
              Max age
            </label>
            <div className="relative">
              <Cake
                className={`absolute left-3 top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 pointer-events-none ${LUCIDE_STROKE_FIELD}`}
                strokeWidth={2.5}
                aria-hidden
              />
              <FormInput
                id="patient-age-max"
                type="number"
                min={0}
                max={AGE_FILTER_MAX}
                step={1}
                inputMode="numeric"
                placeholder="Any"
                value={ageMax}
                onKeyDown={blockNegativeNumberKeys}
                onChange={(e) => merge({ ageMax: sanitizeAgeFilterParam(e.target.value), page: null })}
                invalid={!!ageRangeFilterError}
                aria-invalid={ageRangeFilterError ? true : undefined}
                aria-describedby={ageRangeFilterError ? 'patient-list-age-range-err' : undefined}
                className="relative z-10 pl-10"
              />
            </div>
            <FieldError id="patient-list-age-range-err" className="!mt-1">
              {ageRangeFilterError}
            </FieldError>
          </div>
          <div>
            <label
              htmlFor="patient-reg-from"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5"
            >
              Registered from
            </label>
            <div className="relative">
              <Calendar
                className={`absolute left-3 top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 pointer-events-none ${LUCIDE_STROKE_FIELD}`}
                strokeWidth={2.5}
                aria-hidden
              />
              <FormInput
                id="patient-reg-from"
                type="date"
                max={regFromMax}
                value={regFrom}
                onChange={(e) => {
                  if (loadError) setLoadError(null)
                  const v = e.target.value
                  if (!v) {
                    merge({ regFrom: null, page: null })
                    return
                  }
                  const patch: Record<string, string | null> = { regFrom: v, page: null }
                  if (regTo && v > regTo) patch.regTo = v
                  merge(patch)
                }}
                invalid={!!regRangeFilterError}
                aria-invalid={regRangeFilterError ? true : undefined}
                aria-describedby={regRangeFilterError ? 'patient-list-reg-range-err' : undefined}
                className="relative z-10 pl-10 min-h-[42px]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="patient-reg-to"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5"
            >
              Registered to
            </label>
            <div className="relative">
              <Calendar
                className={`absolute left-3 top-1/2 z-20 h-[18px] w-[18px] -translate-y-1/2 pointer-events-none ${LUCIDE_STROKE_FIELD}`}
                strokeWidth={2.5}
                aria-hidden
              />
              <FormInput
                id="patient-reg-to"
                type="date"
                min={regToMin}
                max={todayStr}
                value={regTo}
                onChange={(e) => {
                  if (loadError) setLoadError(null)
                  const v = e.target.value
                  if (!v) {
                    merge({ regTo: null, page: null })
                    return
                  }
                  const patch: Record<string, string | null> = { regTo: v, page: null }
                  if (regFrom && v < regFrom) patch.regFrom = v
                  merge(patch)
                }}
                invalid={!!regRangeFilterError}
                aria-invalid={regRangeFilterError ? true : undefined}
                aria-describedby={regRangeFilterError ? 'patient-list-reg-range-err' : undefined}
                className="relative z-10 pl-10 min-h-[42px]"
              />
            </div>
            <FieldError id="patient-list-reg-range-err" className="!mt-1">
              {regRangeFilterError}
            </FieldError>
          </div>
          <div className="sm:col-span-2 xl:col-span-2">
            <SearchableIdPicker<{ id: string; label: string }>
              id="patient-dept-filter"
              label="Department (from appointments)"
              inputLeadingIcon={Building2}
              items={departmentFilterItems}
              selectedId={departmentFilter}
              onSelectId={(id) => merge({ dept: id || null, page: null })}
              getId={(o) => o.id}
              getLabel={(o) => o.label}
              filterItem={filterLabeledOption}
              placeholder="Search department…"
              emptyLabel="All departments"
              accent="sky"
              className="w-full"
            />
            {departmentOptions.length === 0 && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Book appointments to enable this filter.</p>
            )}
          </div>
        </div>
        {!loading && patients.length > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-white tabular-nums">
              {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
            </span>
            –
            <span className="font-semibold text-slate-700 dark:text-white tabular-nums">
              {Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="font-semibold tabular-nums">{filtered.length}</span>
            {filtered.length !== patients.length && (
              <span className="text-slate-600 dark:text-slate-400"> (from {patients.length} total)</span>
            )}
          </p>
        )}
      </DashboardCard>

      <DashboardCard title="Patient directory" className="relative z-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-sky-500" aria-hidden />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading patients…</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14 px-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ring-1 ring-slate-200 dark:ring-slate-700">
              <Users className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
            <p className="text-slate-700 dark:text-white font-semibold">No patients yet</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
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
            <p className="text-slate-700 dark:text-white font-semibold">No matches</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
              Try clearing filters or adjusting your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null)
                merge({
                  q: null,
                  blood: null,
                  gender: null,
                  ageMin: null,
                  ageMax: null,
                  regFrom: null,
                  regTo: null,
                  dept: null,
                  page: null,
                })
              }}
              className="mt-5 text-sm font-semibold text-sky-600 dark:text-white hover:underline"
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
                    <tr className="text-slate-600 dark:text-white">
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
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/60 dark:to-slate-800 text-xs font-bold text-sky-800 dark:text-white ring-1 ring-sky-200/60 dark:ring-sky-900/40">
                            {initials(p.fullName)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 font-mono text-xs font-medium text-sky-600 dark:text-white whitespace-nowrap">
                          {p.id}
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="font-semibold text-slate-900 dark:text-white">{p.fullName}</span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 text-slate-600 dark:text-white whitespace-nowrap tabular-nums">
                          {p.phone}
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="inline-flex capitalize px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white">
                            {p.gender}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-white ring-1 ring-rose-200/50 dark:ring-rose-900/40">
                            {p.bloodGroup}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 text-slate-600 dark:text-white">{p.city}</td>
                        <td className="px-4 sm:px-5 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                            <Link
                              to={`/admin/patients/${encodeURIComponent(p.id)}`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-white hover:bg-sky-500/20 transition-colors"
                              aria-label={`View profile for ${p.fullName}`}
                              title="View profile"
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </Link>
                            <Link
                              to={`/admin/patients/${encodeURIComponent(p.id)}/edit`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                              aria-label={`Edit ${p.fullName}`}
                              title="Edit patient"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeactivateTarget(p)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 dark:text-white hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              aria-label={`Deactivate ${p.fullName}`}
                              title="Deactivate patient"
                            >
                              <UserX className="h-4 w-4" aria-hidden />
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
                  onClick={() => merge({ page: safePage <= 2 ? null : String(safePage - 1) })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-white tabular-nums text-center">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => merge({ page: String(safePage + 1) })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </DashboardCard>

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate patient?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-semibold text-slate-800 dark:text-white">{deactivateTarget.fullName}</span>
              <span className="font-mono text-xs block mt-2 text-slate-500 dark:text-slate-400">{deactivateTarget.id}</span>
              <span className="block mt-3">They will be hidden from this list (soft-delete).</span>
            </>
          ) : null
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        variant="danger"
        confirmLoading={deactivateBusy}
        onCancel={() => !deactivateBusy && setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
