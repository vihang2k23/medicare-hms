import { useAuth } from '../hooks/useAuth'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import {
  MOCK_PATIENTS_TODAY,
  MOCK_BED_OCCUPANCY,
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
} from 'recharts'
import { Banknote, BedDouble, Ticket, Users } from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { tokens, currentToken } = useSelector((state: RootState) => state.queue)
  const alerts = useSelector((state: RootState) => state.alerts.alerts).slice(0, 5)
  const opdWaiting = tokens.filter((t) => t.status === 'waiting').length
  const opdDone = tokens.filter((t) => t.status === 'done').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome, {user?.name}.</p>
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
          value={`${Math.round((MOCK_BED_OCCUPANCY[1].value / 50) * 100)}%`}
          subLabel="18 of 50 beds occupied"
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
                  data={MOCK_BED_OCCUPANCY}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${percent != null ? (percent * 100).toFixed(0) : 0}%`}
                >
                  {MOCK_BED_OCCUPANCY.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => [`${Number(value)} beds`, 'Count']} />
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
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
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
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{doc.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">({doc.dept})</span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
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
