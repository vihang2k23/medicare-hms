import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/ui/DashboardCard'
import { wardDisplayName } from '../config/wards'
import { BedGrid } from '../features/beds'
import { MOCK_PENDING_VITALS, MOCK_RECENT_BED_CHANGES } from '../data/dashboardMockData'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'

export default function NurseDashboard() {
  const { user } = useAuth()
  const { wardSummary } = useSelector((state: RootState) => state.beds)
  const totalBeds = Object.values(wardSummary).reduce(
    (acc, w) => acc + w.available + w.occupied + w.reserved + w.maintenance,
    0
  )
  const occupiedBeds = Object.values(wardSummary).reduce((acc, w) => acc + w.occupied, 0)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 mb-2">Ward</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Nurse dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
          Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardCard title="Ward bed status summary">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{occupiedBeds}</div>
            <div className="text-slate-500 dark:text-slate-400 text-sm">
              of {totalBeds} beds occupied
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(wardSummary).map(([wardId, counts]) => (
              <div
                key={wardId}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {wardDisplayName(wardId)}
                  <span className="font-mono text-slate-500 dark:text-slate-400 font-normal text-[11px] ml-1">
                    {wardId}
                  </span>
                </span>
                <span className="block mt-0.5 text-slate-500 dark:text-slate-400">
                  Occ {counts.occupied} · Free {counts.available} · Rsv {counts.reserved}
                  {counts.maintenance > 0 ? ` · Maint ${counts.maintenance}` : ''}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
        <DashboardCard title="Pending vitals records">
          {MOCK_PENDING_VITALS.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">None pending.</p>
          ) : (
            <ul className="space-y-2">
              {MOCK_PENDING_VITALS.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{v.patientName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{v.room}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Ward bed status grid</h2>
          <BedGrid showWardSummary={false} />
        </div>
        <DashboardCard title="Recent bed status changes">
          <ul className="space-y-2">
            {MOCK_RECENT_BED_CHANGES.map((change, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <span className="text-slate-500 dark:text-slate-400">{change.time}</span>
                <span className="text-slate-800 dark:text-slate-100">
                  {change.ward} · Bed {change.bed}
                </span>
                <span
                  className={
                    change.action === 'Freed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {change.action}
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  )
}
