import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import {
  MOCK_PATIENTS_TODAY,
  MOCK_REVENUE_DATA,
  MOCK_TOP_DEPARTMENTS,
  MOCK_DOCTOR_AVAILABILITY,
} from '../data/dashboardMockData'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'
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
  const { tokens, currentToken } = useSelector((state: RootState) => state.queue)
  const beds = useSelector((state: RootState) => state.beds.beds)
  const alerts = useSelector((state: RootState) => state.alerts.alerts).slice(0, 5)
  const opdWaiting = tokens.filter((t) => t.status === 'waiting').length
  const opdDone = tokens.filter((t) => t.status === 'done').length

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
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-2">Overview</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
          Welcome back, <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>.
        </p>
      </div>

      {/* Top row: stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Patients today"
          value={MOCK_PATIENTS_TODAY}
          subLabel="Total registrations"
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
          value={currentToken ?? '—'}
          subLabel={`Waiting: ${opdWaiting} · Done: ${opdDone}`}
          accent="green"
          icon={<Ticket className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Revenue (today)"
          value="₹22.1k"
          subLabel="Billing summary"
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
                  formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Revenue summary (last 7 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_REVENUE_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                data={MOCK_TOP_DEPARTMENTS}
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
            {MOCK_DOCTOR_AVAILABILITY.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{doc.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm sm:ml-2 block sm:inline">
                    ({doc.dept})
                  </span>
                </div>
                <span
                  className={`self-start sm:self-auto text-xs font-medium px-2 py-1 rounded shrink-0 ${
                    doc.status === 'available'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
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
          <p className="text-slate-500 dark:text-slate-400 text-sm">No alerts.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`text-sm p-2 rounded ${
                  a.level === 'error'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : a.level === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
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
