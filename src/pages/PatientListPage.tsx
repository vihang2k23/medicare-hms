import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { PatientRecord } from '../types/patient'
import { fetchPatients } from '../api/patientsApi'

export default function PatientListPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const location = useLocation()
  const registeredId = (location.state as { registeredId?: string } | null)?.registeredId

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchPatients()
      list.sort((a, b) => b.createdAt - a.createdAt)
      setPatients(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load patients. Is JSON Server running? (`npm run server`)')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Patients</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registered patients (JSON Server)</p>
        </div>
        <Link
          to="/admin/patients/new"
          className="inline-flex justify-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"
        >
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No patients yet. Register one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Patient ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Blood</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-mono text-xs text-sky-600 dark:text-sky-400">{p.id}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{p.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.phone}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.bloodGroup}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
