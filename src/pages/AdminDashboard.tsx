import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../shared/hooks/useAuth'
import DashboardCard from '../shared/ui/DashboardCard'
import StatCard from '../shared/ui/StatCard'
import { fetchPatients } from '../shared/api/patientsApi'
import {
  estimateRevenueToday,
  formatInrCompact,
  formatLocalDate,
  revenueSeriesLast7Days,
  startOfLocalDayMs,
  topDepartmentsByUniquePatients,
} from '../shared/lib/dashboardMetrics'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { formatOpdTokenLabel } from '../features/queue/queueSlice'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Banknote, BedDouble, Ticket, Users } from 'lucide-react'

const BED_PIE_COLORS = {
  available: '#22c55e',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  maintenance: '#64748b',
} as const

export default function AdminDashboard() {
  const { user } = useAuth()
  const opdQueue = useSelector((state: RootState) => state.queue.queue)
  const opdCurrentToken = useSelector((state: RootState) => state.queue.currentToken)
  const beds = useSelector((state: RootState) => state.beds.beds)
  const appointments = useSelector((state: RootState) => state.appointments.appointments)
  const scheduleDoctors = useSelector((state: RootState) => state.appointments.doctors)
  const prescriptions = useSelector((state: RootState) => state.prescriptions.prescriptions)
  const alerts = useSelector((state: RootState) => state.alerts.alerts).slice(0, 5)
  const todayStr = formatLocalDate(new Date())
  const t0 = startOfLocalDayMs()

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

  const prescriptionsToday = useMemo(
    () => prescriptions.filter((p) => p.createdAt >= t0).length,
    [prescriptions, t0],
  )

  const revenueToday = useMemo(
    () => estimateRevenueToday(appointments, prescriptionsToday, todayStr),
    [appointments, prescriptionsToday, todayStr],
  )

  const topDeptChart = useMemo(() => {
    const rows = topDepartmentsByUniquePatients(appointments, 5)
    return rows.length > 0 ? rows : [{ name: 'No appointments yet', patients: 0 }]
  }, [appointments])
  const revenueChart = useMemo(() => revenueSeriesLast7Days(appointments), [appointments])
  const doctorAvailabilityRows = useMemo(
    () => scheduleDoctors.slice(0, 8).map((d) => ({ id: d.id, name: d.name, dept: d.department, status: 'available' as const })),
    [scheduleDoctors],
  )
  const opdWaiting = opdQueue.filter((t) => t.status === 'waiting').length
  const opdDone = opdQueue.filter((t) => t.status === 'done').length

  const bedPieData = useMemo(() => {
    const c = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    for (const b of beds) c[b.status]++
    return [
      { name: 'Available', value: c.available, color: BED_PIE_COLORS.available },
      { name: 'Occupied', value: c.occupied, color: BED_PIE_COLORS.occupied },
      { name: 'Reserved', value: c.reserved, color: BED_PIE_COLORS.reserved },
      { name: 'Maintenance', value: c.maintenance, color: BED_PIE_COLORS.maintenance },
    ]
  }, [beds])

  const totalBeds = beds.length
  const occupiedBedCount = beds.filter((b) => b.status === 'occupied').length
  const bedOccupancyPct = totalBeds > 0 ? Math.round((occupiedBedCount / totalBeds) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-white mb-2">Overview</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin dashboard</h1>
        <p className="text-slate-600 dark:text-white mt-2 text-sm">
          Welcome back, <span className="font-semibold text-slate-800 dark:text-white">{user?.name}</span>.
        </p>
      </div>

      {/* Top row: stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Patients today"
          value={registrationsTodayLoading ? '…' : registrationsToday}
          subLabel="New registrations (active)"
          accent="blue"
          icon={<Users className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Bed occupancy"
          value={`${bedOccupancyPct}%`}
          subLabel={`${occupiedBedCount} of ${totalBeds} beds occupied`}
          accent="amber"
          icon={<BedDouble className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="OPD queue"
          value={opdCurrentToken != null ? formatOpdTokenLabel(opdCurrentToken) : '—'}
          subLabel={`Waiting: ${opdWaiting} · Done: ${opdDone}`}
          accent="green"
          icon={<Ticket className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Revenue (today)"
          value={formatInrCompact(revenueToday)}
          subLabel="Estimated from completed visits + scripts"
          accent="slate"
          icon={<Banknote className="h-5 w-5" aria-hidden />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Bed occupancy rate">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bedPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="72%"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={false}
                >
                  {bedPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => [`${Number(value)} beds`, 'Count']} />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value) => <span className="text-xs text-slate-600 dark:text-white">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Revenue summary (last 7 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: unknown) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Top 5 departments by patient load">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDeptChart}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                  tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 12)}…` : v)}
                />
                <Tooltip />
                <Bar dataKey="patients" fill="#10b981" radius={[0, 4, 4, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Doctor availability">
          <div className="space-y-2">
            {doctorAvailabilityRows.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 dark:text-white">{doc.name}</span>
                  <span className="text-slate-500 dark:text-white text-sm sm:ml-2 block sm:inline">
                    ({doc.dept})
                  </span>
                </div>
                <span
                  className={`self-start sm:self-auto text-xs font-medium px-2 py-1 rounded shrink-0 ${
                    doc.status === 'available'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-white'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-white'
                  }`}
                >
                  {doc.status === 'available' ? 'Available' : 'Busy'}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Recent alerts (last 5)">
        {alerts.length === 0 ? (
          <p className="text-slate-500 dark:text-white text-sm">No alerts.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`text-sm p-2 rounded ${
                  a.level === 'error'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-white'
                    : a.level === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-white'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-white'
                }`}
              >
                {a.message}
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  )
}
