import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import QueueBoard from '../features/queue/QueueBoard'
import { Link } from 'react-router-dom'
import { Calendar, Ticket, UserPlus } from 'lucide-react'
import { MOCK_REGISTRATIONS_TODAY, MOCK_PENDING_APPOINTMENTS } from '../data/dashboardMockData'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'

export default function ReceptionistDashboard() {
  const { user } = useAuth()
  const { tokens, currentToken, servedToday } = useSelector((state: RootState) => state.queue)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Receptionist Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Registration count today"
          value={MOCK_REGISTRATIONS_TODAY}
          subLabel="New patients"
          accent="blue"
          icon={<UserPlus className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Current OPD token"
          value={currentToken ?? '—'}
          subLabel={`${tokens.filter((t) => t.status === 'waiting').length} waiting · ${servedToday} served`}
          accent="amber"
          icon={<Ticket className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Pending appointments"
          value={MOCK_PENDING_APPOINTMENTS}
          subLabel="For today"
          accent="green"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">OPD queue live view</h2>
          <QueueBoard />
        </div>
        <DashboardCard title="Quick actions">
          <div className="flex flex-col gap-2">
            <Link
              to="/receptionist/queue"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-medium transition-colors"
            >
              <Ticket className="h-4 w-4" aria-hidden />
              Issue token
            </Link>
            <Link
              to="/receptionist/registration"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Register new patient
            </Link>
            <Link
              to="/receptionist"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
            >
              Book appointment
            </Link>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
