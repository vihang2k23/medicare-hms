import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardCard } from '../components/common'
import { BedGrid } from '../domains/beds'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { fetchPatients } from '../services/patientsApi'
import { fetchAllVitals } from '../services/vitalsApi'
import type { PatientRecord } from '../types'
import type { VitalRecord } from '../types'

// NurseDashboard defines the Nurse Dashboard UI surface and its primary interaction flow.
const VITALS_STALE_MS = 24 * 60 * 60 * 1000

// NurseDashboard renders the nurse dashboard UI.
export default function NurseDashboard() {
  const { user } = useAuth()
  const [pendingVitals, setPendingVitals] = useState<{ patient: PatientRecord; reason: string }[]>([])
  const { wardSummary, wards, bedFeed } = useSelector((state: RootState) => state.beds)
  const totalBeds = Object.values(wardSummary).reduce(
    (acc, w) => acc + w.available + w.occupied + w.reserved + w.maintenance,
    0
  )
  const occupiedBeds = Object.values(wardSummary).reduce((acc, w) => acc + w.occupied, 0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [patients, vitals] = await Promise.all([fetchPatients(), fetchAllVitals()])
        if (cancelled) return
        const byPatient: Record<string, VitalRecord[]> = {}
        for (const v of vitals) {
          if (!byPatient[v.patientId]) byPatient[v.patientId] = []
          byPatient[v.patientId]!.push(v)
        }
        for (const k of Object.keys(byPatient)) {
          byPatient[k]!.sort((a, b) => b.recordedAt - a.recordedAt)
        }
        const now = Date.now()
        const list: { patient: PatientRecord; reason: string }[] = []
        for (const p of patients) {
          const last = byPatient[p.id]?.[0]
          if (!last) list.push({ patient: p, reason: 'No vitals on file' })
          else if (now - last.recordedAt > VITALS_STALE_MS) {
            list.push({ patient: p, reason: 'No reading in 24h' })
          }
        }
        setPendingVitals(list.slice(0, 8))
      } catch {
        if (!cancelled) setPendingVitals([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const pendingSummary = useMemo(() => {
    if (pendingVitals.length === 0) return 'All active patients have a vital within 24h (or none registered).'
    return `${pendingVitals.length} patient(s) may need vitals.`
  }, [pendingVitals.length])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-white mb-2">Ward</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Nurse dashboard</h1>
        <p className="text-slate-600 dark:text-white mt-2 text-sm">
          Welcome, <span className="font-semibold text-slate-800 dark:text-white">{user?.name}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardCard title="Ward bed status summary">
          <div className="flex items-center gap-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tabular-nums">{occupiedBeds}</div>
            <div className="text-slate-500 dark:text-white text-sm">
              of {totalBeds} beds occupied
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(wardSummary).map(([wardId, counts]) => (
              <div
                key={wardId}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs leading-relaxed text-slate-600 dark:text-white"
              >
                <span className="font-semibold text-slate-800 dark:text-white">
                  {wards.find((w) => w.id === wardId)?.name ?? wardId}
                  <span className="font-mono text-slate-500 dark:text-white font-normal text-[11px] ml-1">
                    {wardId}
                  </span>
                </span>
                <span className="block mt-0.5 text-slate-500 dark:text-white">
                  Occ {counts.occupied} · Free {counts.available} · Rsv {counts.reserved}
                  {counts.maintenance > 0 ? ` · Maint ${counts.maintenance}` : ''}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
        <DashboardCard title="Pending vitals records">
          <p className="text-xs text-slate-500 dark:text-white mb-3">{pendingSummary}</p>
          {pendingVitals.length === 0 ? (
            <p className="text-slate-500 dark:text-white text-sm">None flagged.</p>
          ) : (
            <ul className="space-y-2">
              {pendingVitals.map(({ patient, reason }) => (
                <li
                  key={patient.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-white">{patient.fullName}</span>
                    <span className="block text-[11px] font-mono text-sky-600 dark:text-white">{patient.id}</span>
                    <span className="text-xs text-amber-800 dark:text-white">{reason}</span>
                  </div>
                  <Link
                    to="/nurse/vitals"
                    className="text-xs font-semibold text-orange-700 dark:text-white hover:underline shrink-0"
                  >
                    Record vitals →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Ward bed status grid</h2>
          <BedGrid showWardSummary={false} showWardManagement={false} showAddBed={false} />
        </div>
        <DashboardCard title="Recent bed status changes">
          {bedFeed.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white">
              Updates appear here when beds change (assign, discharge, status, or navbar bed simulation).
            </p>
          ) : (
            <ul className="space-y-2">
              {bedFeed.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-0.5 text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <span className="text-[11px] font-medium text-slate-400 dark:text-white tabular-nums">
                    {new Date(e.time).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="text-slate-800 dark:text-white leading-snug">{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
