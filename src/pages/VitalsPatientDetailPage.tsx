import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, User } from 'lucide-react'
import { fetchPatientById } from '../services/patientsApi'
import { fetchVitalsByPatientId } from '../services/vitalsApi'
import type { PatientRecord } from '../types'
import type { VitalRecord } from '../types'
import { notify } from '../utils/helpers'
import VitalsHistoryList from '../domains/vitals/VitalsHistoryList'

// VitalsPatientDetailPage defines the Vitals Patient Detail Page UI surface and its primary interaction flow.
const VitalsTrendCharts = lazy(() => import('../domains/vitals/VitalsTrendCharts'))

function patientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

// VitalsPatientDetailPage renders the vitals patient detail page UI.
export default function VitalsPatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>()

  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined)
  const [vitals, setVitals] = useState<VitalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    let cancelled = false

    async function loadData() {
      try {
        setLoading(true)
        const [patientData, vitalsData] = await Promise.all([
          fetchPatientById(patientId!),
          fetchVitalsByPatientId(patientId!)
        ])
        
        if (!cancelled) {
          setPatient(patientData)
          setVitals(vitalsData)
        }
      } catch {
        if (!cancelled) {
          setPatient(null)
          setVitals([])
          notify.error('Failed to load patient data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [patientId])

  
  
  if (!patientId) {
    return (
      <div className="text-sm text-slate-600 dark:text-white">
        Missing patient id.{' '}
        <Link to="/nurse/vitals" className="font-semibold text-orange-600 dark:text-white">
          Back to vitals list
        </Link>
      </div>
    )
  }

  if (loading || patient === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" aria-hidden />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading patient vitals…</p>
      </div>
    )
  }

  if (patient === null) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-slate-700 dark:text-white font-medium">Patient not found.</p>
        <Link
          to="/nurse/vitals"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to vitals list
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          to="/nurse/vitals"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-white hover:text-orange-600 dark:hover:text-white w-fit"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All patients
        </Link>
              </div>

      <div className="rounded-2xl border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/90 via-white to-white dark:from-orange-950/20 dark:via-slate-900/80 dark:to-slate-900/90 px-5 py-5 sm:px-6 sm:py-6 ring-1 ring-orange-100/80 dark:ring-orange-950/30">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-white mb-2">Patient vitals</p>
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white text-lg font-bold shadow-md shadow-orange-600/25">
            {patientInitials(patient.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{patient.fullName}</h1>
            <p className="text-sm text-slate-600 dark:text-white mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sky-700 dark:text-white">{patient.id}</span>
              <span className="text-slate-600 dark:text-slate-400">·</span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" aria-hidden />
                DOB {patient.dob} · <span className="capitalize">{patient.gender}</span>
              </span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {vitals.length} reading{vitals.length === 1 ? '' : 's'} on file · Newest first in charts and table below.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 shadow-md shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-slate-700/50 overflow-hidden">
        <div className="border-b border-slate-200/90 dark:border-slate-700/90 px-5 py-4 sm:px-6 bg-slate-50/80 dark:bg-slate-900/70">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trends</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Line charts when there are two or more entries per metric.</p>
        </div>
        <div className="p-5 sm:p-6 lg:p-8">
          {vitals.length > 0 ? (
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-xl bg-slate-50/80 dark:bg-slate-800/30">
                  <Loader2 className="h-9 w-9 animate-spin text-orange-500" aria-hidden />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Loading charts…</span>
                </div>
              }
            >
              <VitalsTrendCharts rows={vitals} />
            </Suspense>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-950/20 px-4 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
              No vitals yet. Use <strong className="text-slate-700 dark:text-white">Record vitals</strong> to add the first reading.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 shadow-md shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-slate-700/50 p-5 sm:p-6 lg:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Full history</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Expand any row for notes and record ids.</p>
        <VitalsHistoryList rows={vitals} listKey={patientId} />
      </section>

    </div>
  )
}
