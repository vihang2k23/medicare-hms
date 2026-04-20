import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMergeSearchParams } from '../shared/hooks/useMergeSearchParams'
import { useSelector } from 'react-redux'
import { Calendar, ChevronLeft, ChevronRight, FileText, Search, Users } from 'lucide-react'
import type { RootState } from '../app/store'
import { useAuth } from '../shared/hooks/useAuth'
import { fetchPatients } from '../shared/api/patientsApi'
import type { PatientRecord } from '../shared/types/patient'
import { FieldError, FormInput } from '../shared/ui/form'
import { aggregateMyPatients, type MyPatientRowMeta } from '../shared/lib/myPatientsForDoctor'

// DoctorMyPatientsPage defines the Doctor My Patients Page UI surface and its primary interaction flow.
const PAGE_SIZE = 10

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

function formatActivity(ts: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type Row = { patientId: string; record: PatientRecord | null; meta: MyPatientRowMeta }

// DoctorMyPatientsPage renders the doctor my patients page UI.
export default function DoctorMyPatientsPage() {
  const { user } = useAuth()
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)

  const [apiPatients, setApiPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { searchParams, merge } = useMergeSearchParams()
  const searchQuery = searchParams.get('q') ?? ''

  const metaById = useMemo(
    () => aggregateMyPatients(user?.id, appointments, prescriptions),
    [user?.id, appointments, prescriptions],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchPatients()
      setApiPatients(list)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not load patients. Is JSON Server running? (`npm run server`)'
      setLoadError(msg)
      setApiPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    const byId = new Map(apiPatients.map((p) => [p.id, p]))
    for (const [patientId, meta] of metaById) {
      out.push({
        patientId,
        record: byId.get(patientId) ?? null,
        meta,
      })
    }
    out.sort((a, b) => b.meta.lastActivityAt - a.meta.lastActivityAt)
    return out
  }, [metaById, apiPatients])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const name = (r.record?.fullName ?? r.meta.displayNameHint ?? '').toLowerCase()
      const id = r.patientId.toLowerCase()
      const phone = (r.record?.phone ?? '').replace(/\s/g, '')
      const qq = q.replace(/\s/g, '')
      return name.includes(q) || id.includes(q) || phone.includes(qq)
    })
  }, [rows, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRaw = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const safePage = Math.min(pageRaw, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 text-emerald-600 dark:text-white">
          Clinical
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My patients</h1>
        <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-2xl leading-relaxed">
          Patients you have seen on <strong className="font-medium text-slate-700 dark:text-white">your schedule</strong> or{' '}
          <strong className="font-medium text-slate-700 dark:text-white">your prescriptions</strong>. Cancelled appointments are
          excluded.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 p-4 sm:p-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            aria-hidden
          />
          <FormInput
            type="search"
            value={searchQuery}
            onChange={(e) => {
              if (loadError) setLoadError(null)
              merge({ q: e.target.value.trim() ? e.target.value : null, page: null })
            }}
            placeholder="Search by name, id, or phone…"
            className="!pl-10 !pr-4 focus:!ring-emerald-500/35 focus:!border-emerald-400/40"
            aria-label="Search patients"
            invalid={!!loadError}
            aria-invalid={loadError ? true : undefined}
            aria-describedby={loadError ? 'doctor-my-patients-load-err' : undefined}
          />
        </div>
        <FieldError id="doctor-my-patients-load-err" className="!mt-0">
          {loadError}
        </FieldError>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-white py-8 text-center">Loading patients…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-white mb-3" aria-hidden />
            <p className="text-slate-700 dark:text-white font-medium">No patients linked yet</p>
            <p className="text-sm text-slate-500 dark:text-white mt-2 max-w-md mx-auto">
              Book appointments on your schedule or create a prescription to populate this list.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <Link
                to="/doctor/schedule"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Schedule
              </Link>
              <Link
                to="/doctor/prescriptions"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Prescriptions
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-white">
              {filtered.length === rows.length
                ? `${rows.length} patient${rows.length === 1 ? '' : 's'} · Most recent activity first`
                : `Showing ${filtered.length} of ${rows.length} patient${rows.length === 1 ? '' : 's'}`}
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 hidden md:table-cell">Last activity</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Care context</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageSlice.map((r) => {
                    const name = r.record?.fullName ?? r.meta.displayNameHint ?? r.patientId
                    const inactive = r.record && r.record.isActive === false
                    return (
                      <tr key={r.patientId} className="bg-white dark:bg-slate-900/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-white text-xs font-bold">
                              {initials(name)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{name}</p>
                              <p className="font-mono text-xs text-emerald-700 dark:text-white truncate">{r.patientId}</p>
                              {!r.record && (
                                <p className="text-xs text-amber-700 dark:text-white mt-0.5">Not in registry API</p>
                              )}
                              {inactive && (
                                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white">
                                  Inactive
                                </span>
                              )}
                              <p className="md:hidden text-xs text-slate-500 dark:text-white mt-1">
                                {formatActivity(r.meta.lastActivityAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-white">
                          {r.record?.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-600 dark:text-white whitespace-nowrap">
                          {formatActivity(r.meta.lastActivityAt)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-600 dark:text-white">
                          <span className="inline-flex flex-wrap gap-1">
                            {r.meta.fromAppointment && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-white">
                                Schedule ({r.meta.appointmentCount})
                              </span>
                            )}
                            {r.meta.fromPrescription && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-white">
                                Rx ({r.meta.prescriptionCount})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              to={`/doctor/patients/${encodeURIComponent(r.patientId)}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              Profile
                            </Link>
                            <Link
                              to={`/doctor/prescriptions?patient=${encodeURIComponent(r.patientId)}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              Rx
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-white">
                  Page {safePage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => merge({ page: safePage <= 2 ? null : String(safePage - 1) })}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => merge({ page: String(safePage + 1) })}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
