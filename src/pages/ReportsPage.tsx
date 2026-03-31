import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RootState } from '../app/store'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import { fetchAllPatients } from '../api/patientsApi'
import { downloadCsv } from '../lib/csvExport'
import { BedDouble, Calendar, Download, FileText, ListOrdered, Printer, Stethoscope, Users } from 'lucide-react'

const BED_STATUS_COLORS = {
  Available: '#22c55e',
  Occupied: '#ef4444',
  Reserved: '#f59e0b',
  Maintenance: '#64748b',
} as const

const OPD_STATUS_COLORS: Record<string, string> = {
  Waiting: '#0ea5e9',
  'In progress': '#f59e0b',
  Done: '#22c55e',
  Skipped: '#94a3b8',
}

const APPT_STATUS_COLORS: Record<string, string> = {
  scheduled: '#94a3b8',
  confirmed: '#0ea5e5',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
  'no-show': '#a855f7',
}

function formatReportTimestamp() {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function ReportsPage() {
  const queue = useSelector((s: RootState) => s.queue)
  const beds = useSelector((s: RootState) => s.beds.beds)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)
  const [patientTotal, setPatientTotal] = useState<number | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('report-print-route')
    return () => document.documentElement.classList.remove('report-print-route')
  }, [])

  useEffect(() => {
    void fetchAllPatients()
      .then((p) => setPatientTotal(p.length))
      .catch(() => setPatientTotal(null))
  }, [])

  const importedDoctors = doctors.filter((d) => d.source === 'npi').length
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length

  const volumeBarData = useMemo(
    () => [
      { name: 'OPD tokens', value: queue.tokens.length },
      { name: 'Beds (total)', value: beds.length },
      { name: 'Appointments', value: appointments.length },
      { name: 'Prescriptions', value: prescriptions.length },
      { name: 'Schedule doctors', value: doctors.length },
    ],
    [queue.tokens.length, beds.length, appointments.length, prescriptions.length, doctors.length],
  )

  const opdStatusPie = useMemo(() => {
    const c = { waiting: 0, 'in-progress': 0, done: 0, skipped: 0 }
    for (const t of queue.tokens) {
      c[t.status]++
    }
    return [
      { name: 'Waiting', value: c.waiting, color: OPD_STATUS_COLORS.Waiting },
      { name: 'In progress', value: c['in-progress'], color: OPD_STATUS_COLORS['In progress'] },
      { name: 'Done', value: c.done, color: OPD_STATUS_COLORS.Done },
      { name: 'Skipped', value: c.skipped, color: OPD_STATUS_COLORS.Skipped },
    ].filter((d) => d.value > 0)
  }, [queue.tokens])

  const bedStatusPie = useMemo(() => {
    const c = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    for (const b of beds) c[b.status]++
    return [
      { name: 'Available', value: c.available, color: BED_STATUS_COLORS.Available },
      { name: 'Occupied', value: c.occupied, color: BED_STATUS_COLORS.Occupied },
      { name: 'Reserved', value: c.reserved, color: BED_STATUS_COLORS.Reserved },
      { name: 'Maintenance', value: c.maintenance, color: BED_STATUS_COLORS.Maintenance },
    ]
  }, [beds])

  const appointmentsByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of appointments) {
      m[a.status] = (m[a.status] ?? 0) + 1
    }
    return Object.entries(m).map(([status, value]) => ({
      name: status.replace(/-/g, ' '),
      value,
      fill: APPT_STATUS_COLORS[status] ?? '#8b5cf6',
    }))
  }, [appointments])

  const wardStackData = useMemo(() => {
    type Row = { ward: string; Available: number; Occupied: number; Reserved: number; Maintenance: number }
    const map = new Map<string, Row>()
    for (const b of beds) {
      if (!map.has(b.wardName)) {
        map.set(b.wardName, {
          ward: b.wardName,
          Available: 0,
          Occupied: 0,
          Reserved: 0,
          Maintenance: 0,
        })
      }
      const row = map.get(b.wardName)!
      if (b.status === 'available') row.Available++
      else if (b.status === 'occupied') row.Occupied++
      else if (b.status === 'reserved') row.Reserved++
      else row.Maintenance++
    }
    return Array.from(map.values()).sort((a, b) => a.ward.localeCompare(b.ward))
  }, [beds])

  const buildCsvRows = useCallback((): string[][] => {
    const ts = formatReportTimestamp()
    const rows: string[][] = [
      ['MediCare HMS — operational report'],
      ['Generated', ts],
      [],
      ['Summary', 'Value'],
      ['Patients (registry)', patientTotal == null ? '' : String(patientTotal)],
      ['Imported NPI doctors', String(importedDoctors)],
      ['Beds occupied', `${occupiedBeds} / ${beds.length}`],
      ['OPD tokens (session)', String(queue.tokens.length)],
      ['OPD now serving', queue.currentToken ?? ''],
      ['OPD served today (counter)', String(queue.servedToday)],
      ['Appointments', String(appointments.length)],
      ['Prescriptions', String(prescriptions.length)],
      ['Schedule doctors', String(doctors.length)],
      [],
      ['OPD token', 'Patient', 'Status', 'Department'],
      ...queue.tokens.map((t) => [
        t.tokenNumber,
        t.patientName,
        t.status,
        t.department ?? '',
      ]),
      [],
      ['Bed id', 'Ward', 'Bed #', 'Status', 'Occupant / patient id'],
      ...beds.map((b) => [
        b.id,
        b.wardName,
        b.bedNumber,
        b.status,
        b.occupantName ?? b.patientId ?? '',
      ]),
      [],
      ['Appointment id', 'Patient', 'Doctor', 'Date', 'Start', 'End', 'Status', 'Department'],
      ...appointments.map((a) => [
        a.id,
        a.patientName,
        a.doctorName,
        a.date,
        a.slotStart,
        a.slotEnd,
        a.status,
        a.department,
      ]),
      [],
      ['Prescription id', 'Patient', 'Doctor', 'Status', 'Medicine lines', 'Created (epoch ms)'],
      ...prescriptions.map((p) => [
        p.id,
        p.patientName,
        p.doctorName,
        p.status,
        String(p.medicines.length),
        String(p.createdAt),
      ]),
    ]
    return rows
  }, [
    appointments,
    beds,
    doctors.length,
    importedDoctors,
    occupiedBeds,
    patientTotal,
    prescriptions,
    queue.currentToken,
    queue.servedToday,
    queue.tokens,
  ])

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadCsv(`medicare-hms-report-${stamp}.csv`, buildCsvRows())
  }

  const handlePrint = () => {
    window.print()
  }

  const pieFallback = (
    <p className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">No data for this chart.</p>
  )

  return (
    <div className="reports-print-root space-y-8">
      <div className="print-only-banner px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 mb-2">
        <p className="font-bold text-base">MediCare HMS — operational report</p>
        <p className="text-sm text-slate-600">Printed {formatReportTimestamp()}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-2">
            Analytics
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reports &amp; analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
            OPD queue, beds, appointments, and prescriptions from live session state; patient count from JSON Server when
            available. Export CSV or print this view.
          </p>
        </div>
        <div className="no-print-report flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-white text-sm font-semibold shadow-md hover:from-violet-500 hover:to-violet-600"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </button>
        </div>
      </div>

      <section className="report-format rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 p-4 sm:p-5 space-y-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        <header className="border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">MediCare HMS - Daily Operations Report</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Standardized format for admin sharing, print, and audit records</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 mt-3">
            <p><span className="font-semibold">Generated:</span> {formatReportTimestamp()}</p>
            <p><span className="font-semibold">Department:</span> Hospital Operations</p>
            <p><span className="font-semibold">Prepared by:</span> MediCare HMS System</p>
          </div>
        </header>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">1) Summary Metrics</h3>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <th className="w-[60%] text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Patients (registry)</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{patientTotal ?? '—'}</td>
              </tr>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Imported NPI doctors</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{importedDoctors}</td>
              </tr>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Beds occupied</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{occupiedBeds} / {beds.length}</td>
              </tr>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">OPD tokens</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{queue.tokens.length}</td>
              </tr>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Appointments</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{appointments.length}</td>
              </tr>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Prescriptions</th>
                <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{prescriptions.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">2) OPD Status Breakdown</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Status</th>
                <th className="text-right border border-slate-300 dark:border-slate-600 px-2 py-1.5">Count</th>
              </tr>
            </thead>
            <tbody>
              {opdStatusPie.length === 0 ? (
                <tr>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5" colSpan={2}>No OPD tokens in session</td>
                </tr>
              ) : (
                opdStatusPie.map((r) => (
                  <tr key={r.name}>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{r.name}</td>
                    <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{r.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">3) Beds by Ward</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left border border-slate-300 dark:border-slate-600 px-2 py-1.5">Ward</th>
                <th className="text-right border border-slate-300 dark:border-slate-600 px-2 py-1.5">Available</th>
                <th className="text-right border border-slate-300 dark:border-slate-600 px-2 py-1.5">Occupied</th>
                <th className="text-right border border-slate-300 dark:border-slate-600 px-2 py-1.5">Reserved</th>
                <th className="text-right border border-slate-300 dark:border-slate-600 px-2 py-1.5">Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {wardStackData.map((r) => (
                <tr key={r.ward}>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{r.ward}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{r.Available}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{r.Occupied}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{r.Reserved}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-right">{r.Maintenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          This report is system-generated for operational monitoring and administrative review.
        </footer>
      </section>

      <div className="no-print-report grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Patients (registry)"
          value={patientTotal ?? '—'}
          subLabel={patientTotal == null ? 'Start JSON Server for count' : 'All records in db.json'}
          accent="blue"
          icon={<Users className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Imported NPI doctors"
          value={importedDoctors}
          subLabel="In appointments schedule + internal directory"
          accent="green"
          icon={<Stethoscope className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Beds occupied"
          value={`${occupiedBeds} / ${beds.length}`}
          subLabel="Current Redux bed grid"
          accent="amber"
          icon={<BedDouble className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="OPD tokens (session)"
          value={queue.tokens.length}
          subLabel={`Now serving: ${queue.currentToken ?? '—'}`}
          accent="slate"
          icon={<ListOrdered className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Appointments"
          value={appointments.length}
          subLabel="Persisted in this browser"
          accent="blue"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Prescriptions"
          value={prescriptions.length}
          subLabel="Persisted in this browser"
          accent="green"
          icon={<FileText className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="no-print-report grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="OPD queue — token status">
          <div className="h-72">
            {opdStatusPie.length === 0 ? (
              pieFallback
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={opdStatusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius="44%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {opdStatusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [`${Number(value)} tokens`, 'Count']} />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Beds — status mix">
          <div className="h-72">
            {beds.length === 0 ? (
              pieFallback
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bedStatusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius="44%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                  >
                    {bedStatusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [`${Number(value)} beds`, 'Count']} />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="no-print-report grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Operational volume (snapshot)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" interval={0} angle={-15} textAnchor="end" height={52} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Appointments — by status">
          <div className="h-72">
            {appointmentsByStatus.length === 0 ? (
              pieFallback
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsByStatus} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Count">
                    {appointmentsByStatus.map((e) => (
                      <Cell key={e.name} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="no-print-report">
      <DashboardCard title="Beds by ward (stacked)">
        <div className="h-80">
          {wardStackData.length === 0 ? (
            pieFallback
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardStackData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} stroke="#64748b" interval={0} angle={-12} textAnchor="end" height={64} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Available" stackId="a" fill={BED_STATUS_COLORS.Available} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Occupied" stackId="a" fill={BED_STATUS_COLORS.Occupied} />
                <Bar dataKey="Reserved" stackId="a" fill={BED_STATUS_COLORS.Reserved} />
                <Bar dataKey="Maintenance" stackId="a" fill={BED_STATUS_COLORS.Maintenance} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashboardCard>
      </div>

      <p className="no-print-report text-[11px] text-slate-400 dark:text-slate-500 max-w-3xl leading-relaxed">
        CSV includes summary metrics plus row-level OPD tokens, beds, appointments, and prescriptions. Print uses your browser
        dialog; charts are tuned for light output on paper when using dark mode in the app.
      </p>
    </div>
  )
}
