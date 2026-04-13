import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import type { RootState } from '../app/store'
import { useAuth } from '../hooks/useAuth'
import type { PatientRecord } from '../types/patient'
import type { VitalRecord } from '../types/vitals'
import { fetchPatientById } from '../api/patientsApi'
import { fetchVitalsByPatientId } from '../api/vitalsApi'
import VitalsHistoryList from '../components/vitals/VitalsHistoryList'
import VitalsTrendCharts from '../components/vitals/VitalsTrendCharts'
import { downloadCsv } from '../lib/csvExport'
import { scheduleDoctorIdForAuthUser } from '../config/doctorScheduleMap'
import { isPatientInDoctorCare } from '../lib/myPatientsForDoctor'
import type { Appointment } from '../features/appointments/types'

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

function aptSortKey(a: Appointment): number {
  const time = a.slotStart.length === 5 ? `${a.slotStart}:00` : a.slotStart
  const t = Date.parse(`${a.date}T${time}`)
  return Number.isFinite(t) ? t : a.createdAt
}

export default function DoctorPatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const { user } = useAuth()
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)

  const [searchParams, setSearchParams] = useSearchParams()
  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview'
    const t = new URLSearchParams(window.location.search).get('tab')
    return isTab(t) ? t : 'overview'
  })
  const [vitals, setVitals] = useState<VitalRecord[] | null>(null)

  const inCare = useMemo(() => {
    if (!patientId) return false
    return isPatientInDoctorCare(user?.id, patientId, appointments, prescriptions)
  }, [user?.id, patientId, appointments, prescriptions])

  const scheduleDoctorId = scheduleDoctorIdForAuthUser(user?.id)

  const myAppointments = useMemo(() => {
    if (!patientId) return []
    return appointments
      .filter((a) => a.patientId === patientId && a.doctorId === scheduleDoctorId && a.status !== 'cancelled')
      .sort((a, b) => aptSortKey(b) - aptSortKey(a))
  }, [appointments, patientId, scheduleDoctorId])

  const myPrescriptions = useMemo(() => {
    if (!patientId || !user?.id) return []
    return prescriptions
      .filter((r) => r.patientId === patientId && r.doctorId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [prescriptions, patientId, user?.id])

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
        <p className="text-slate-500 dark:text-white">Loading…</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/patients" className="text-sm text-emerald-600 dark:text-white hover:underline">
          ← My patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-white">
          {error ?? 'Patient not found.'}
        </div>
      </div>
    )
  }

  if (!inCare) {
    return (
      <div className="space-y-4">
        <Link to="/doctor/patients" className="text-sm text-emerald-600 dark:text-white hover:underline">
          ← My patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-white">
          This patient is not linked to your schedule or your prescriptions in this workspace.
        </div>
      </div>
    )
  }

  const inactive = patient.isActive === false

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/doctor/patients" className="text-sm text-emerald-600 dark:text-white hover:underline">
            ← My patients
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mt-2">{patient.fullName}</h1>
          <p className="font-mono text-sm text-emerald-600 dark:text-white mt-1">{patient.id}</p>
          {inactive && (
            <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white">
              Inactive (archived)
            </span>
          )}
        </div>
        <Link
          to={`/doctor/prescriptions?patient=${encodeURIComponent(patient.id)}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40 self-start"
        >
          <FileText className="h-4 w-4" aria-hidden />
          New prescription
        </Link>
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
                ? 'border-emerald-600 text-emerald-600 dark:text-white dark:border-emerald-400'
                : 'border-transparent text-slate-500 dark:text-white hover:text-slate-700 dark:hover:text-white'
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
              <dt className="text-slate-500 dark:text-white">Date of birth</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.dob}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Gender</dt>
              <dd className="text-slate-800 dark:text-white font-medium capitalize">{patient.gender}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Blood group</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.bloodGroup}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Phone</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Email</dt>
              <dd className="text-slate-800 dark:text-white font-medium break-all">{patient.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-white">Address</dt>
              <dd className="text-slate-800 dark:text-white font-medium">
                {patient.address}, {patient.city}, {patient.state} {patient.pin}
              </dd>
            </div>
            {patient.photo && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500 dark:text-white mb-2">Photo</dt>
                <dd>
                  <img
                    src={patient.photo}
                    alt=""
                    className="h-32 w-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                  />
                </dd>
              </div>
            )}
          </dl>
        )}

        {tab === 'medical' && (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Allergies</h3>
              <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.allergies || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Chronic conditions</h3>
              <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.chronicConditions || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Past surgeries</h3>
              <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.pastSurgeries || '—'}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Current medications</h3>
              <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.currentMedications || '—'}</p>
            </section>
          </div>
        )}

        {tab === 'emergency' && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-white">Contact name</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyName}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Relationship</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyRelationship}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-white">Phone</dt>
              <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyPhone}</dd>
            </div>
          </dl>
        )}

        {tab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3">
              <p className="text-xs text-slate-600 dark:text-white leading-relaxed">
                Nurse-recorded vitals. Read-only for clinicians; entry is from the nurse vitals workflow.
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
                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>
            {vitals === null ? (
              <p className="text-sm text-slate-500 dark:text-white">Loading vitals…</p>
            ) : (
              <>
                <VitalsTrendCharts rows={vitals} />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">History</h3>
                  <VitalsHistoryList rows={vitals} listKey={patientId ?? ''} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {(myAppointments.length > 0 || myPrescriptions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myAppointments.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-3">
                Your appointments
              </h2>
              <ul className="space-y-3 text-sm">
                {myAppointments.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-800 dark:text-white">
                      {a.date} · {a.slotStart}–{a.slotEnd}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-white capitalize">{a.status}</span>
                  </li>
                ))}
              </ul>
              {myAppointments.length > 8 && (
                <p className="text-xs text-slate-500 dark:text-white mt-2">Showing 8 most recent.</p>
              )}
            </section>
          )}
          {myPrescriptions.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-3">
                Your prescriptions
              </h2>
              <ul className="space-y-3 text-sm">
                {myPrescriptions.slice(0, 8).map((rx) => (
                  <li key={rx.id} className="border-b border-slate-100 dark:border-slate-700/80 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-800 dark:text-white font-medium">
                        {new Date(rx.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs capitalize text-emerald-700 dark:text-white">{rx.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white mt-1">
                      {rx.medicines.length} medicine{rx.medicines.length === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
