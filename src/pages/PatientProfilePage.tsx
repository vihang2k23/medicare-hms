import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { format } from 'date-fns'
import type { PatientRecord } from '../types/patient'
import type { VitalRecord } from '../types/vitals'
import { fetchPatientById } from '../api/patientsApi'
import { fetchVitalsByPatientId } from '../api/vitalsApi'
import VitalsHistoryList from '../components/vitals/VitalsHistoryList'
import VitalsTrendCharts from '../components/vitals/VitalsTrendCharts'
import { downloadCsv } from '../lib/csvExport'

type Tab = 'overview' | 'medical' | 'emergency' | 'vitals'

function isTab(v: string | null): v is Tab {
  return v === 'overview' || v === 'medical' || v === 'emergency' || v === 'vitals'
}

function vitalsToCsvRows(rows: VitalRecord[]): string[][] {
  const header = ['Recorded at (ISO)', 'Systolic', 'Diastolic', 'Pulse', 'Temp °C', 'SpO₂ %', 'Recorded by', 'Notes']
  const sorted = [...rows].sort((a, b) => b.recordedAt - a.recordedAt)
  const body = sorted.map((v) => [
    new Date(v.recordedAt).toISOString(),
    v.systolic != null ? String(v.systolic) : '',
    v.diastolic != null ? String(v.diastolic) : '',
    v.pulse != null ? String(v.pulse) : '',
    v.tempC != null ? String(v.tempC) : '',
    v.spo2 != null ? String(v.spo2) : '',
    v.recordedBy ?? '',
    v.notes ?? '',
  ])
  return [header, ...body]
}

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview'
    const t = new URLSearchParams(window.location.search).get('tab')
    return isTab(t) ? t : 'overview'
  })
  const [error, setError] = useState<string | null>(null)
  const [vitals, setVitals] = useState<VitalRecord[] | null>(null)

  useEffect(() => {
    if (!patientId) {
      setPatient(null)
      return
    }
    let cancelled = false
    setError(null)
    setPatient(undefined)
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

  useEffect(() => {
    if (!patientId || tab !== 'vitals') return
    let cancelled = false
    setVitals(null)
    void (async () => {
      try {
        const rows = await fetchVitalsByPatientId(patientId)
        if (!cancelled) setVitals(rows)
      } catch {
        if (!cancelled) setVitals([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [patientId, tab])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (isTab(t)) setTab(t)
  }, [searchParams])

  const setTabInUrl = (id: Tab) => {
    setTab(id)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', id)
        return next
      },
      { replace: true },
    )
  }

  if (patient === undefined) {
    return (
      <div className="p-6">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
          ← Back to patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {error ?? 'Patient not found.'}
        </div>
      </div>
    )
  }

  const inactive = patient.isActive === false

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            ← Patients
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mt-2">{patient.fullName}</h1>
          <p className="font-mono text-sm text-sky-600 dark:text-sky-400 mt-1">{patient.id}</p>
          {inactive && (
            <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
              Inactive (archived)
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Link
            to={`/admin/prescriptions?patient=${encodeURIComponent(patient.id)}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Prescription
          </Link>
          <Link
            to={`/admin/patients/${encodeURIComponent(patient.id)}/edit`}
            className="inline-flex justify-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-1 overflow-x-auto overflow-y-hidden -mx-1 px-1">
        {(
          [
            ['overview', 'Overview'],
            ['medical', 'Medical'],
            ['emergency', 'Emergency'],
            ['vitals', 'Vitals'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTabInUrl(id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6">
        {tab === 'overview' && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Date of birth</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.dob}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Gender</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium capitalize">{patient.gender}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Blood group</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.bloodGroup}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium break-all">{patient.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Address</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">
                {patient.address}, {patient.city}, {patient.state} {patient.pin}
              </dd>
            </div>
            {patient.photo && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500 dark:text-slate-400 mb-2">Photo</dt>
                <dd>
                  <img src={patient.photo} alt="" className="h-32 w-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                </dd>
              </div>
            )}
          </dl>
        )}

        {tab === 'medical' && (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Allergies</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{patient.allergies || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Chronic conditions</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{patient.chronicConditions || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Past surgeries</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{patient.pastSurgeries || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Current medications</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{patient.currentMedications || '—'}</p>
            </section>
          </div>
        )}

        {tab === 'emergency' && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Contact name</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.emergencyName}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Relationship</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.emergencyRelationship}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
              <dd className="text-slate-800 dark:text-slate-100 font-medium">{patient.emergencyPhone}</dd>
            </div>
          </dl>
        )}

        {tab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nurse-recorded vitals (BP, pulse, temperature, SpO₂). Add readings from{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">Vitals entry</strong> (nurse menu).
              </p>
              {vitals != null && vitals.length > 0 && patientId && (
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `vitals-${patientId}-${format(Date.now(), 'yyyy-MM-dd-HHmm')}.csv`,
                      vitalsToCsvRows(vitals),
                    )
                  }
                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>
            {vitals === null ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading vitals…</p>
            ) : (
              <>
                <VitalsTrendCharts rows={vitals} />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">History</h3>
                  <VitalsHistoryList rows={vitals} listKey={patientId ?? ''} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
