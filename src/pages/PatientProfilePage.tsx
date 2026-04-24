import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Activity,
  Calendar,
  ExternalLink,
  FileText,
  Pencil,
  Pill,
  Receipt,
  UserRound,
} from 'lucide-react'
import { format } from 'date-fns'
import type { RootState } from '../store'
import type { PatientRecord } from '../types'
import type { VitalRecord } from '../types'
import type { Appointment } from '../domains/appointments/types'
import type { PrescriptionStatus } from '../domains/prescriptions/types'
import { fetchPatientById } from '../services/patientsApi'
import { fetchVitalsByPatientId } from '../services/vitalsApi'
import VitalsHistoryList from '../domains/vitals/VitalsHistoryList'
import VitalsTrendCharts from '../domains/vitals/VitalsTrendCharts'
import { downloadCsv } from '../utils/helpers'
import { appointmentStatusClasses } from '../domains/appointments/appointmentStatusStyles'
import { buildSimulatedBillingForPatient, billingTotals } from '../utils/business'
import type { BillingRecordStatus } from '../types'

// PatientProfilePage defines the Patient Profile Page UI surface and its primary interaction flow.
type Tab = 'overview' | 'appointments' | 'prescriptions' | 'vitals' | 'billing'

function isTab(v: string | null): v is Tab {
  return (
    v === 'overview' ||
    v === 'appointments' ||
    v === 'prescriptions' ||
    v === 'vitals' ||
    v === 'billing'
  )
}

/** Old URLs ?tab=medical|emergency → overview */
function tabFromSearchParams(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab')
  if (t === 'medical' || t === 'emergency') return 'overview'
  if (isTab(t)) return t
  return 'overview'
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

function appointmentSortKey(a: Appointment): string {
  const time = a.slotStart.length === 5 ? `${a.slotStart}:00` : a.slotStart
  return `${a.date}T${time}`
}

const RX_STATUS_PILL: Record<
  PrescriptionStatus,
  string
> = {
  active:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-white ring-1 ring-emerald-300/60 dark:ring-emerald-700/50',
  completed: 'bg-slate-100 text-slate-800 dark:bg-slate-700/80 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-600',
  cancelled: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-white ring-1 ring-red-200 dark:ring-red-900/60',
}

const BILL_STATUS_PILL: Record<BillingRecordStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-white',
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-white',
  partial: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-white',
}

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

// PatientProfilePage renders the patient profile page UI.
export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)

  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview'
    return tabFromSearchParams(new URLSearchParams(window.location.search))
  })
  const [error, setError] = useState<string | null>(null)
  const [vitals, setVitals] = useState<VitalRecord[] | null>(null)

  const patientAppointments = useMemo(() => {
    if (!patientId) return []
    return appointments
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => appointmentSortKey(b).localeCompare(appointmentSortKey(a)))
  }, [appointments, patientId])

  const patientPrescriptions = useMemo(() => {
    if (!patientId) return []
    return prescriptions.filter((r) => r.patientId === patientId).sort((a, b) => b.createdAt - a.createdAt)
  }, [prescriptions, patientId])

  const billingRows = useMemo(() => {
    if (!patientId) return []
    return buildSimulatedBillingForPatient(patientId, appointments, prescriptions)
  }, [patientId, appointments, prescriptions])

  const billingSummary = useMemo(() => billingTotals(billingRows), [billingRows])

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTab(tabFromSearchParams(searchParams))
  }, [searchParams])
  /* eslint-enable react-hooks/set-state-in-effect */

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
        <p className="text-slate-600 dark:text-slate-400">Loading…</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-white hover:underline">
          ← Back to patients
        </Link>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-white">
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
          <Link to="/admin/patients" className="text-sm text-sky-600 dark:text-white hover:underline">
            ← Patients
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mt-2">{patient.fullName}</h1>
          <p className="font-mono text-sm text-sky-600 dark:text-white mt-1">{patient.id}</p>
          {inactive && (
            <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white">
              Inactive (archived)
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Link
            to={`/admin/prescriptions?patient=${encodeURIComponent(patient.id)}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="New prescription"
            aria-label="New prescription"
          >
            <FileText className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to={`/admin/appointments`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-white hover:bg-sky-50 dark:hover:bg-sky-950/40"
            title="Appointments"
            aria-label="Open appointments"
          >
            <Calendar className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to={`/admin/patients/${encodeURIComponent(patient.id)}/edit`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
            title="Edit patient"
            aria-label="Edit patient"
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-1 overflow-x-auto overflow-y-hidden -mx-1 px-1">
        {(
          [
            ['overview', 'Overview', UserRound],
            ['appointments', 'Appointments', Calendar],
            ['prescriptions', 'Prescriptions', Pill],
            ['vitals', 'Vitals', Activity],
            ['billing', 'Billing', Receipt],
          ] as const
        ).map(([id, label, TabIcon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTabInUrl(id)}
            className={`inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-sky-600 text-sky-600 dark:text-white dark:border-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <TabIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6">
        {tab === 'overview' && (
          <div className="space-y-10 text-sm">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">
                Demographics
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Date of birth</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.dob}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Gender</dt>
                  <dd className="text-slate-800 dark:text-white font-medium capitalize">{patient.gender}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Blood group</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.bloodGroup}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Phone</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.phone}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Email</dt>
                  <dd className="text-slate-800 dark:text-white font-medium break-all">{patient.email}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-600 dark:text-slate-400">Address</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">
                    {patient.address}, {patient.city}, {patient.state} {patient.pin}
                  </dd>
                </div>
                {patient.photo && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-600 dark:text-slate-400 mb-2">Photo</dt>
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
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">
                Medical history
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-1">Allergies</h4>
                  <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.allergies || '—'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-1">Chronic conditions</h4>
                  <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.chronicConditions || '—'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-1">Past surgeries</h4>
                  <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.pastSurgeries || '—'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-1">Current medications</h4>
                  <p className="text-slate-600 dark:text-white whitespace-pre-wrap">{patient.currentMedications || '—'}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">
                Emergency contact
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Contact name</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyName}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Relationship</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyRelationship}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Phone</dt>
                  <dd className="text-slate-800 dark:text-white font-medium">{patient.emergencyPhone}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-slate-600 dark:text-white text-sm">
                {patientAppointments.length === 0
                  ? 'No appointments in the schedule store for this patient yet.'
                  : `${patientAppointments.length} record${patientAppointments.length === 1 ? '' : 's'} (newest first).`}
              </p>
              <Link
                to="/admin/appointments"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-white hover:underline"
              >
                Open appointment calendar
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {patientAppointments.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                {patientAppointments.map((a) => (
                  <li key={a.id} className="px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-slate-900/30">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {a.date} · {a.slotStart}–{a.slotEnd}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-white mt-0.5">
                          {a.doctorName} · {a.department}
                        </p>
                        {a.reason && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Reason: {a.reason}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize border ${appointmentStatusClasses(a.status)}`}
                      >
                        {a.status.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-slate-600 dark:text-white text-sm">
                {patientPrescriptions.length === 0
                  ? 'No prescriptions for this patient in history yet.'
                  : `${patientPrescriptions.length} prescription${patientPrescriptions.length === 1 ? '' : 's'}.`}
              </p>
              <Link
                to={`/admin/prescriptions?patient=${encodeURIComponent(patient.id)}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-white hover:underline"
              >
                Write prescription
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {patientPrescriptions.length > 0 && (
              <ul className="space-y-3">
                {patientPrescriptions.map((rx) => (
                  <li
                    key={rx.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {format(new Date(rx.createdAt), 'PPp')}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-white mt-0.5">{rx.doctorName}</p>
                        {rx.diagnosis && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Dx: {rx.diagnosis}</p>
                        )}
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {rx.medicines.length} medicine line{rx.medicines.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${RX_STATUS_PILL[rx.status]}`}>
                          {rx.status}
                        </span>
                        <Link
                          to={`/admin/prescriptions/${encodeURIComponent(rx.id)}/print`}
                          className="text-xs font-semibold text-sky-600 dark:text-white hover:underline"
                        >
                          Print
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3">
              <p className="text-xs text-slate-600 dark:text-white leading-relaxed">
                Nurse-recorded vitals (BP, pulse, temperature, SpO₂). Add readings from{' '}
                <strong className="font-semibold text-slate-700 dark:text-white">Vitals entry</strong> (nurse menu).
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading vitals…</p>
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

        {tab === 'billing' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-950 dark:text-white flex gap-3">
              <Receipt className="h-5 w-5 shrink-0 mt-0.5 opacity-80" aria-hidden />
              <p>
                <strong className="font-semibold">Simulated billing</strong> — lines are generated from this patient&apos;s
                appointments and prescriptions in the app. When JSON Server exposes a <code className="text-xs font-mono">billing</code>{' '}
                resource, this tab can load persisted invoices instead.
              </p>
            </div>

            {billingRows.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No billable visits or prescriptions yet — complete a visit or add a prescription to see sample charges.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Total charges</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                      {money.format(billingSummary.total)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Recorded paid</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-white mt-1 tabular-nums">
                      {money.format(billingSummary.paid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Outstanding (est.)</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-white mt-1 tabular-nums">
                      {money.format(billingSummary.outstanding)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {billingRows.map((r) => (
                        <tr key={r.id} className="bg-white dark:bg-slate-900/20">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{r.type}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-white max-w-md">{r.description}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-white whitespace-nowrap">{r.date}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                            {money.format(r.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg capitalize ${BILL_STATUS_PILL[r.status]}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
