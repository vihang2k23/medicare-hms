import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { PatientRecord } from '../types/patient'
import { UserPlus } from 'lucide-react'
import { fetchPatients, softDeletePatient } from '../api/patientsApi'
import { notify } from '../lib/notify'

const PAGE_SIZE = 8

const BLOOD_OPTIONS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

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
    const q = searchQuery.trim().toLowerCase()
    return patients.filter((p) => {
      if (bloodFilter && p.bloodGroup !== bloodFilter) return false
      if (genderFilter && p.gender !== genderFilter) return false
      if (!q) return true
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        p.id.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      )
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-2">Registry</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Patients</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
            Search, filter, and manage active patient records synced with JSON Server.
          </p>
        </div>
        <Link
          to="/admin/patients/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Register patient
        </Link>
      </div>

      {loadError && (
        <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-5 py-4 text-sm font-medium text-amber-950 dark:text-amber-200 ring-1 ring-amber-200/50 dark:ring-amber-500/20">
          {loadError}
        </div>
      )}

      {registeredId && (
        <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-5 py-4 text-sm font-medium text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-200/50 dark:ring-emerald-500/20">
          Patient registered successfully. ID: <strong>{registeredId}</strong>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/45 backdrop-blur-sm p-5 sm:p-6 space-y-4 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Search</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, phone, email, or patient ID"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Blood group</label>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">All</option>
              {BLOOD_OPTIONS.filter(Boolean).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          {filtered.length !== patients.length && ` (filtered from ${patients.length})`}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/45 backdrop-blur-sm overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No patients yet. Register one to get started.</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No patients match your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1">
              <table className="w-full min-w-[640px] text-sm text-left">
                <thead className="bg-slate-50/90 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700/80">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">Patient ID</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">Name</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">Phone</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">Gender</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">Blood</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider">City</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100/90 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
                        {p.id}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 font-medium text-slate-900 dark:text-slate-100 max-w-[10rem] sm:max-w-none truncate sm:whitespace-normal">
                        {p.fullName}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.phone}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-slate-600 dark:text-slate-300 capitalize">{p.gender}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-slate-600 dark:text-slate-300">{p.bloodGroup}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-slate-600 dark:text-slate-300">{p.city}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-right whitespace-nowrap space-x-2 sm:space-x-3">
                        <Link
                          to={`/admin/patients/${encodeURIComponent(p.id)}`}
                          className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/patients/${encodeURIComponent(p.id)}/edit`}
                          className="text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deactivate(p)}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 sm:px-5 py-4 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/50">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 rounded-xl border border-slate-200/90 dark:border-slate-600 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
