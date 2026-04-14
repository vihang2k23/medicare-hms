import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PatientRecord } from '../types/patient'
import { fetchPatientById } from '../api/patientsApi'
import PatientRegistrationForm from '../features/patients/PatientRegistrationForm'

export default function PatientEditPage() {
  const { patientId: rawId } = useParams<{ patientId: string }>()
  const patientId = rawId?.trim() ?? ''
  if (!patientId) {
    return (
      <div className="space-y-4">
        <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-white hover:underline">
          ← Back to patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
          Missing patient id in the URL.
        </div>
      </div>
    )
  }
  return <PatientEditLoaded key={patientId} patientId={patientId} />
}

function PatientEditLoaded({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const p = await fetchPatientById(patientId)
        if (!cancelled) setPatient(p)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load patient')
          setPatient(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [patientId])

  if (patient === undefined) {
    return <p className="text-slate-500 dark:text-white">Loading…</p>
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-white hover:underline">
          ← Back to patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
          {error ?? 'Patient not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/admin/patients/${encodeURIComponent(patient.id)}`}
          className="text-sm text-sky-600 dark:text-white hover:underline"
        >
          ← Profile
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mt-2">Edit patient</h1>
        <p className="text-slate-500 dark:text-white text-sm mt-1 font-mono">{patient.id}</p>
      </div>
      <PatientRegistrationForm
        initialRecord={patient}
        redirectTo={`/admin/patients/${encodeURIComponent(patient.id)}`}
        exitTo={`/admin/patients/${encodeURIComponent(patient.id)}`}
        exitLabel="← Back to profile"
      />
    </div>
  )
}
