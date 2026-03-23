import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import {
  MOCK_TODAY_APPOINTMENTS,
  MOCK_NEXT_PATIENT,
  MOCK_PRESCRIPTIONS_TODAY,
} from '../data/dashboardMockData'
import { Calendar, FileText } from 'lucide-react'

export default function DoctorDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Doctor Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Prescriptions today"
          value={MOCK_PRESCRIPTIONS_TODAY}
          subLabel="Written so far"
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
          <div className="w-12 h-12 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-lg">
            {MOCK_NEXT_PATIENT.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{MOCK_NEXT_PATIENT.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
                <p className="font-medium text-slate-800 dark:text-slate-100">{apt.patientName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{apt.time}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  apt.status === 'completed'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    : apt.status === 'in-progress'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                }`}
              >
                {apt.status === 'in-progress' ? 'In progress' : apt.status === 'completed' ? 'Done' : 'Waiting'}
              </span>
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard title="My schedule summary">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Today: 09:00 – 13:00 (8 slots). Next slot at 10:30.
        </p>
      </DashboardCard>
    </div>
  )
}
