import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '../shared/hooks/useAuth'
import type { RootState } from '../app/store'
import DashboardCard from '../shared/ui/DashboardCard'
import StatCard from '../shared/ui/StatCard'
import { MOCK_TODAY_APPOINTMENTS, MOCK_NEXT_PATIENT } from '../shared/data/dashboardMockData'
import { Calendar, FileText } from 'lucide-react'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)

  const prescriptionsToday = useMemo(() => {
    if (!user?.id) return 0
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const t0 = start.getTime()
    return prescriptions.filter((p) => p.doctorId === user.id && p.createdAt >= t0).length
  }, [prescriptions, user])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-white mb-2">Clinical</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Doctor dashboard</h1>
        <p className="text-slate-600 dark:text-white mt-2 text-sm">
          <span className="font-semibold text-slate-800 dark:text-white">{user?.name}</span> — today at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Prescriptions today"
          value={prescriptionsToday}
          subLabel="Today"
          accent="blue"
          icon={<FileText className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Appointments today"
          value={MOCK_TODAY_APPOINTMENTS.length}
          subLabel="Scheduled"
          accent="green"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
      </div>

      <DashboardCard title="Next patient">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <div className="w-12 h-12 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-sky-700 dark:text-white font-bold text-lg">
            {MOCK_NEXT_PATIENT.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{MOCK_NEXT_PATIENT.name}</p>
            <p className="text-sm text-slate-500 dark:text-white">
              Token {MOCK_NEXT_PATIENT.token} · {MOCK_NEXT_PATIENT.reason}
            </p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Today's appointments">
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {MOCK_TODAY_APPOINTMENTS.map((apt) => (
            <li key={apt.id} className="flex items-center justify-between py-3 first:pt-0">
              <div>
                <p className="font-medium text-slate-800 dark:text-white">{apt.patientName}</p>
                <p className="text-sm text-slate-500 dark:text-white">{apt.time}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  apt.status === 'completed'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white'
                    : apt.status === 'in-progress'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-white'
                      : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-white'
                }`}
              >
                {apt.status === 'in-progress' ? 'In progress' : apt.status === 'completed' ? 'Done' : 'Waiting'}
              </span>
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard title="My schedule summary">
        <p className="text-slate-500 dark:text-white text-sm">
          Today: 09:00 – 13:00 (8 slots). Next slot at 10:30.
        </p>
      </DashboardCard>
    </div>
  )
}
