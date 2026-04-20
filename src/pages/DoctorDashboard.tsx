import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '../hooks/useAuth'
import type { RootState } from '../store'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import {
// DoctorDashboard defines the Doctor Dashboard UI surface and its primary interaction flow.
  doctorAppointmentsToday,
  formatLocalDate,
  pickNextDoctorAppointment,
  startOfLocalDayMs,
} from '../utils/dashboardMetrics'
import { Calendar, FileText } from 'lucide-react'

function statusLabel(status: string): string {
  if (status === 'in-progress') return 'In progress'
  if (status === 'completed') return 'Done'
  if (status === 'scheduled') return 'Scheduled'
  if (status === 'confirmed') return 'Confirmed'
  return status
}

// DoctorDashboard renders the doctor dashboard UI.
export default function DoctorDashboard() {
  const { user } = useAuth()
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const todayStr = formatLocalDate(new Date())
  const t0 = startOfLocalDayMs()

  const doctorId = user?.id ?? ''

  const prescriptionsToday = useMemo(() => {
    if (!doctorId) return 0
    return prescriptions.filter((p) => p.doctorId === doctorId && p.createdAt >= t0).length
  }, [prescriptions, doctorId, t0])

  const todayApts = useMemo(
    () => (doctorId ? doctorAppointmentsToday(appointments, doctorId, todayStr) : []),
    [appointments, doctorId, todayStr],
  )

  const sortedToday = useMemo(
    () => [...todayApts].sort((a, b) => a.slotStart.localeCompare(b.slotStart)),
    [todayApts],
  )

  const nextApt = useMemo(() => pickNextDoctorAppointment(todayApts), [todayApts])

  const scheduleBlurb = useMemo(() => {
    if (sortedToday.length === 0) return 'No visits on your calendar for today.'
    const first = sortedToday[0]!
    const last = sortedToday[sortedToday.length - 1]!
    return `Today: ${first.slotStart} – ${last.slotEnd} (${sortedToday.length} on calendar).`
  }, [sortedToday])

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
          value={todayApts.length}
          subLabel="On calendar"
          accent="green"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
      </div>

      <DashboardCard title="Next patient">
        {nextApt ? (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
            <div className="w-12 h-12 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-sky-700 dark:text-white font-bold text-lg">
              {nextApt.patientName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">{nextApt.patientName}</p>
              <p className="text-sm text-slate-500 dark:text-white">
                {nextApt.slotStart} – {nextApt.slotEnd}
                {nextApt.reason ? ` · ${nextApt.reason}` : ''}
              </p>
              <p className="text-xs text-slate-500 dark:text-white mt-0.5">{nextApt.department}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-white py-2">No upcoming visits today (or none scheduled for you).</p>
        )}
      </DashboardCard>

      <DashboardCard title="Today's appointments">
        {sortedToday.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-white">None on the calendar for today.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {sortedToday.map((apt) => (
              <li key={apt.id} className="flex items-center justify-between py-3 first:pt-0">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">{apt.patientName}</p>
                  <p className="text-sm text-slate-500 dark:text-white">
                    {apt.slotStart} – {apt.slotEnd}
                  </p>
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
                  {statusLabel(apt.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard title="My schedule summary">
        <p className="text-slate-500 dark:text-white text-sm">{scheduleBlurb}</p>
      </DashboardCard>
    </div>
  )
}
