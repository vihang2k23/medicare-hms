import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ArrowLeft, Printer } from 'lucide-react'
import type { RootState } from '../app/store'
import { useAuth } from '../hooks/useAuth'
import { fetchPatientById } from '../api/patientsApi'
import MediCareLogo from '../components/brand/MediCareLogo'
import type { PatientRecord } from '../types/patient'

function formatRxDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

function ageFromDob(dob: string): string | null {
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const t = new Date()
  let y = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) y -= 1
  return y >= 0 ? String(y) : null
}

export type PrescriptionPrintVariant = 'admin' | 'doctor'

interface PrescriptionPrintPageProps {
  variant: PrescriptionPrintVariant
}

export default function PrescriptionPrintPage({ variant }: PrescriptionPrintPageProps) {
  const { prescriptionId } = useParams<{ prescriptionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const rx = useSelector((s: RootState) =>
    prescriptionId ? s.prescriptions.prescriptions.find((p) => p.id === prescriptionId) : undefined,
  )
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const [patient, setPatient] = useState<PatientRecord | null>(null)

  const listPath = variant === 'admin' ? '/admin/prescriptions' : '/doctor/prescriptions'

  useEffect(() => {
    document.documentElement.classList.add('prescription-print-route')
    return () => document.documentElement.classList.remove('prescription-print-route')
  }, [])

  useEffect(() => {
    if (!rx) return
    if (variant === 'doctor' && user?.id && rx.doctorId !== user.id) {
      navigate('/access-denied', { replace: true })
    }
  }, [rx, variant, user?.id, navigate])

  useEffect(() => {
    if (!rx) return
    let cancelled = false
    fetchPatientById(rx.patientId)
      .then((p) => {
        if (!cancelled) setPatient(p)
      })
      .catch(() => {
        if (!cancelled) setPatient(null)
      })
    return () => {
      cancelled = true
    }
  }, [rx?.patientId])

  const doctorProfile = useMemo(
    () => (rx ? doctors.find((d) => d.id === rx.doctorId) : undefined),
    [doctors, rx],
  )

  if (!prescriptionId) {
    return (
      <div className="text-slate-600 dark:text-slate-400 text-sm">
        Missing prescription id.{' '}
        <Link to={listPath} className="text-sky-600 dark:text-sky-400 font-medium">
          Back to prescriptions
        </Link>
      </div>
    )
  }

  if (!rx) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600 dark:text-slate-400 text-sm">No prescription found for this id.</p>
        <Link
          to={listPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to prescriptions
        </Link>
      </div>
    )
  }

  if (variant === 'doctor' && user?.id && rx.doctorId !== user.id) {
    return null
  }

  const patientAge = patient?.dob ? ageFromDob(patient.dob) : null

  return (
    <div className="space-y-6">
      <div className="no-print-rx flex flex-wrap items-center gap-3">
        <Link
          to={listPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print / Save as PDF
        </button>
      </div>

      <article className="prescription-print-root rx-print-sheet mx-auto max-w-[210mm] bg-white text-slate-900 shadow-sm sm:shadow-md border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl overflow-hidden print:shadow-none print:border print:rounded-none">
        <header className="rx-print-header border-b-2 border-sky-700/25 bg-sky-50/80 px-6 py-5 print:bg-sky-50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="shrink-0 rounded-xl border border-sky-600/30 bg-white p-1.5">
                <MediCareLogo size="md" title={false} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-800">MediCare HMS</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">Prescription</h1>
                <p className="text-xs text-slate-600 mt-1">Issued {formatRxDate(rx.createdAt)}</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5 shrink-0">
              <p>
                <span className="font-semibold text-slate-800">Rx ID</span>
              </p>
              <p className="font-mono text-[11px] text-sky-800">{rx.id}</p>
              <p className="pt-1">
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    rx.status === 'active'
                      ? 'bg-emerald-100 text-emerald-900'
                      : rx.status === 'completed'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-red-100 text-red-900'
                  }`}
                >
                  {rx.status}
                </span>
              </p>
            </div>
          </div>
        </header>

        <div className="px-6 py-5 space-y-6 print:py-4">
          <section className="rx-print-patient grid gap-4 sm:grid-cols-2 border border-slate-200 rounded-xl p-4 bg-slate-50/60 print:bg-slate-50">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Patient</h2>
              <p className="text-lg font-bold text-slate-900">{rx.patientName}</p>
              <p className="text-xs font-mono text-sky-800 mt-1">ID: {rx.patientId}</p>
              {patient && (
                <ul className="mt-3 text-xs text-slate-700 space-y-1">
                  {patientAge !== null && (
                    <li>
                      <span className="font-semibold text-slate-800">Age:</span> {patientAge} yrs
                    </li>
                  )}
                  <li>
                    <span className="font-semibold text-slate-800">DOB:</span> {patient.dob}
                  </li>
                  <li className="capitalize">
                    <span className="font-semibold text-slate-800">Gender:</span> {patient.gender}
                  </li>
                  {patient.phone && (
                    <li>
                      <span className="font-semibold text-slate-800">Phone:</span> {patient.phone}
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Prescriber</h2>
              <p className="text-base font-bold text-slate-900">{rx.doctorName}</p>
              {doctorProfile && (
                <ul className="mt-2 text-xs text-slate-700 space-y-1">
                  <li>
                    <span className="font-semibold text-slate-800">Department:</span> {doctorProfile.department}
                  </li>
                  {doctorProfile.credential && (
                    <li>
                      <span className="font-semibold text-slate-800">Credential:</span> {doctorProfile.credential}
                    </li>
                  )}
                  {doctorProfile.npi && (
                    <li>
                      <span className="font-semibold text-slate-800">NPI:</span> {doctorProfile.npi}
                    </li>
                  )}
                  {doctorProfile.phone && (
                    <li>
                      <span className="font-semibold text-slate-800">Phone:</span> {doctorProfile.phone}
                    </li>
                  )}
                  {(doctorProfile.practiceAddressLine1 || doctorProfile.practiceCity) && (
                    <li className="pt-1 leading-snug">
                      <span className="font-semibold text-slate-800">Practice:</span>{' '}
                      {[doctorProfile.practiceAddressLine1, doctorProfile.practiceCity, doctorProfile.practiceState]
                        .filter(Boolean)
                        .join(', ')}
                      {doctorProfile.practicePostalCode ? ` ${doctorProfile.practicePostalCode}` : ''}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {(rx.diagnosis || rx.notes) && (
            <section className="space-y-2 text-sm border-l-4 border-sky-500 pl-4">
              {rx.diagnosis && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinical notes</p>
                  <p className="text-slate-800 mt-1 whitespace-pre-wrap">{rx.diagnosis}</p>
                </div>
              )}
              {rx.notes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacy / instructions</p>
                  <p className="text-slate-700 mt-1 whitespace-pre-wrap">{rx.notes}</p>
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Medicines</h2>
            <div className="overflow-x-auto -mx-1 print:overflow-visible">
              <table className="rx-medicine-table w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="border border-slate-300 px-2 py-2 w-[22%]">Drug</th>
                    <th className="border border-slate-300 px-2 py-2 w-[14%]">Dosage</th>
                    <th className="border border-slate-300 px-2 py-2 w-[16%]">Frequency</th>
                    <th className="border border-slate-300 px-2 py-2 w-[12%]">Duration</th>
                    <th className="border border-slate-300 px-2 py-2">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="border border-slate-300 px-2 py-2 font-semibold text-slate-900">{m.drugName}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-800">{m.dosage}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-800">{m.frequency}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-700">{m.duration ?? '—'}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-700 text-xs">
                        {m.instructions ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rx-signature-block pt-6 border-t border-slate-200 print:pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">Authorization</p>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <div className="h-14 border-b-2 border-slate-800 mb-2" />
                <p className="text-xs font-semibold text-slate-800">Prescriber signature</p>
                <p className="text-xs text-slate-600 mt-1">{rx.doctorName}</p>
              </div>
              <div>
                <div className="h-14 border-b-2 border-slate-800 mb-2" />
                <p className="text-xs font-semibold text-slate-800">Date</p>
                <p className="text-xs text-slate-600 mt-1">{formatRxDate(rx.createdAt)}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-8 leading-relaxed max-w-2xl">
              This document is generated from MediCare HMS for training and demonstration. Verify all medications with
              your pharmacist. Controlled substances require compliant prescribing workflows in production systems.
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
