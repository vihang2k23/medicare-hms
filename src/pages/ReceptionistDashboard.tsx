import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DashboardCard, StatCard } from '../components/common'
import QueueBoard from '../domains/queue/QueueBoard'
import { Link } from 'react-router-dom'
import { Calendar, Ticket, UserPlus } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { formatOpdTokenLabel } from '../store/slices/queueSlice'
import { fetchPatients } from '../api/patientsApi'
import { formatLocalDate, pendingAppointmentsToday, startOfLocalDayMs } from '../utils/business'
import { clearPatientRegistrationDraft } from '../domains/patients/patientRegistrationStorage'

// ReceptionistDashboard defines the Receptionist Dashboard UI surface and its primary interaction flow.
// ReceptionistDashboard renders the receptionist dashboard UI.
export default function ReceptionistDashboard() {
  useEffect(() => {
    clearPatientRegistrationDraft()
  }, [])
  const { user } = useAuth()
  const opdQueue = useSelector((s: RootState) => s.queue.queue)
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)
  const servedToday = useSelector((s: RootState) => s.queue.servedToday)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const todayStr = formatLocalDate(new Date())

  const pendingToday = pendingAppointmentsToday(appointments, todayStr)

  const [registrationsTodayLoading, setRegistrationsTodayLoading] = useState(true)
  const [registrationsToday, setRegistrationsToday] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setRegistrationsTodayLoading(true)
      try {
        const list = await fetchPatients()
        if (cancelled) return
        const start = startOfLocalDayMs()
        setRegistrationsToday(list.filter((p) => p.isActive && p.createdAt >= start).length)
      } catch {
        if (!cancelled) setRegistrationsToday(0)
      } finally {
        if (!cancelled) setRegistrationsTodayLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-white mb-2">Front desk</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Receptionist dashboard</h1>
        <p className="text-slate-600 dark:text-white mt-2 text-sm">
          Hello, <span className="font-semibold text-slate-800 dark:text-white">{user?.name}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Registration count today"
          value={registrationsTodayLoading ? '…' : registrationsToday}
          subLabel="New patients"
          accent="blue"
          icon={<UserPlus className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Current OPD token"
          value={currentToken != null ? formatOpdTokenLabel(currentToken) : '—'}
          subLabel={`${opdQueue.filter((t) => t.status === 'waiting').length} waiting · ${servedToday} served`}
          accent="amber"
          icon={<Ticket className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Pending appointments"
          value={pendingToday}
          subLabel="Scheduled or confirmed today"
          accent="green"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">OPD queue live view</h2>
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
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Register new patient
            </Link>
            <Link
              to="/receptionist/appointments"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white text-sm font-medium transition-colors"
            >
              Book appointment
            </Link>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
