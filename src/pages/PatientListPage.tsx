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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Patients</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Search, filter, and manage active patients</p>
        </div>
        <Link
          to="/admin/patients/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Register patient
        </Link>
      </div>

      {loadError && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {loadError}
        </div>
      )}

      {registeredId && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          Patient registered successfully. ID: <strong>{registeredId}</strong>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Search</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, phone, email, or patient ID"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Blood group</label>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
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
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No patients yet. Register one to get started.</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No patients match your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Patient ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Gender</th>
                    <th className="px-4 py-3 font-semibold">Blood</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-sky-600 dark:text-sky-400">{p.id}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{p.fullName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.phone}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">{p.gender}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.bloodGroup}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.city}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
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
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm disabled:opacity-40"
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
