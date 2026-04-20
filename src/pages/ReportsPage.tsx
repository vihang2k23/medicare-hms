import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RootState } from '../store'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import { formatOpdTokenLabel } from '../domains/queue/queueSlice'
import { OPD_DEPARTMENTS } from '../config/departments'
import DrugRecallSummaryCard from '../domains/reports/DrugRecallSummaryCard'
import {
  buildAppointmentOutcomeCounts,
  buildDepartmentPatientDistribution,
  buildDoctorWorkloadThisMonth,
  buildPatientsPerDayFromAppointments,
  buildSimulatedBedOccupancySeries,
  buildSimulatedRevenueByDepartment,
} from '../domains/reports/reportsAnalyticsData'
import { fetchAllPatients } from '../services/patientsApi'
import { downloadCsv } from '../utils/csvExport'
import { MedicarePrintPageFooter, MedicarePrintPageHeader } from '../components/ui/print/MedicarePrintChrome'
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

const DEPT_PIE_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#ec4899',
  '#64748b',
]

/** Stable ids for per-chart print (single-chart PDF / paper). */
const REPORT_CHART_IDS = {
  opdTrend30d: 'opd-trend-30d',
  bedOcc30d: 'bed-occupancy-30d',
  deptPatientPie: 'dept-patient-pie',
  apptOutcomes: 'appt-outcomes-stack',
  doctorWorkload: 'doctor-workload-month',
  revenueSim: 'revenue-dept-sim',
  drugRecall: 'drug-recall-openfda',
  opdTokenPie: 'opd-token-status',
  bedStatusPie: 'bed-status-mix',
  volumeSnap: 'volume-snapshot',
  apptStatusBar: 'appt-by-status',
  bedWardStack: 'beds-ward-stack',
} as const

function ReportChartPrintButton({
  chartId,
  onPrint,
}: {
  chartId: string
  onPrint: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPrint(chartId)}
      className="no-print-report inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
      title="Print this chart only (Save as PDF or paper)"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden />
      Print
    </button>
  )
}

function ReportChartCsvButton({
  chartId,
  onExport,
}: {
  chartId: string
  onExport: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onExport(chartId)}
      className="no-print-report inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
      title="Download this chart’s data as CSV"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      CSV
    </button>
  )
}

function formatReportTimestamp() {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ReportsPage renders the reports page UI.
export default function ReportsPage() {
  const opdQueue = useSelector((s: RootState) => s.queue.queue)
  const opdCurrentToken = useSelector((s: RootState) => s.queue.currentToken)
  const opdServedToday = useSelector((s: RootState) => s.queue.servedToday)
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
    const warmChartsForPrint = () => {
      window.dispatchEvent(new Event('resize'))
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    }
    window.addEventListener('beforeprint', warmChartsForPrint)
    return () => window.removeEventListener('beforeprint', warmChartsForPrint)
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
      { name: 'OPD tokens', value: opdQueue.length },
      { name: 'Beds (total)', value: beds.length },
      { name: 'Appointments', value: appointments.length },
      { name: 'Prescriptions', value: prescriptions.length },
      { name: 'Schedule doctors', value: doctors.length },
    ],
    [opdQueue.length, beds.length, appointments.length, prescriptions.length, doctors.length],
  )

  const opdStatusPie = useMemo(() => {
    const c = { waiting: 0, 'in-progress': 0, done: 0, skipped: 0 }
    for (const t of opdQueue) {
      c[t.status]++
    }
    return [
      { name: 'Waiting', value: c.waiting, color: OPD_STATUS_COLORS.Waiting },
      { name: 'In progress', value: c['in-progress'], color: OPD_STATUS_COLORS['In progress'] },
      { name: 'Done', value: c.done, color: OPD_STATUS_COLORS.Done },
      { name: 'Skipped', value: c.skipped, color: OPD_STATUS_COLORS.Skipped },
    ].filter((d) => d.value > 0)
  }, [opdQueue])

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

  const opdTrendFromAppointments = useMemo(
    () => buildPatientsPerDayFromAppointments(appointments),
    [appointments],
  )

  const bedOccupancySimulated = useMemo(() => buildSimulatedBedOccupancySeries(beds, 30), [beds])

  const departmentPatientPie = useMemo(
    () => buildDepartmentPatientDistribution(appointments),
    [appointments],
  )

  const appointmentOutcomes = useMemo(() => buildAppointmentOutcomeCounts(appointments), [appointments])

  const outcomeStackRow = useMemo(
    () => [
      {
        name: 'Completed / cancelled / no-show',
        completed: appointmentOutcomes.completed,
        cancelled: appointmentOutcomes.cancelled,
        noShow: appointmentOutcomes.noShow,
      },
    ],
    [appointmentOutcomes],
  )

  const doctorWorkloadMonth = useMemo(() => buildDoctorWorkloadThisMonth(appointments), [appointments])

  const revenueByDepartment = useMemo(
    () => buildSimulatedRevenueByDepartment(OPD_DEPARTMENTS),
    [],
  )

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
      ['OPD tokens (session)', String(opdQueue.length)],
      ['OPD now serving', opdCurrentToken != null ? formatOpdTokenLabel(opdCurrentToken) : ''],
      ['OPD served today (counter)', String(opdServedToday)],
      ['Appointments', String(appointments.length)],
      ['Prescriptions', String(prescriptions.length)],
      ['Schedule doctors', String(doctors.length)],
      [],
      ['Token id', 'Patient', 'Status', 'Department', 'Doctor id', 'Doctor name', 'Issued at (epoch ms)'],
      ...opdQueue.map((t) => [
        String(t.tokenId),
        t.patientName,
        t.status,
        t.department,
        t.doctorId,
        t.doctorName,
        String(t.issuedAt),
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
      [],
      ['OPD trend (30d) — unique patients / visits from appointment dates'],
      ['Day label', 'Date', 'Unique patients', 'Visits'],
      ...opdTrendFromAppointments.map((r) => [r.day, r.dayKey, String(r.patients), String(r.visits)]),
      [],
      ['Simulated bed occupancy % (30d demo series)', 'Day', 'Occupancy %'],
      ...bedOccupancySimulated.map((r) => [r.day, String(r.occupancy)]),
      [],
      ['Patients by department (unique w/ booking)', 'Department', 'Patients'],
      ...departmentPatientPie.map((d) => [d.name, String(d.value)]),
      [],
      ['Appointment outcomes', 'Completed', 'Cancelled', 'No-show'],
      [
        String(appointmentOutcomes.completed),
        String(appointmentOutcomes.cancelled),
        String(appointmentOutcomes.noShow),
      ],
      [],
      ['Doctor workload (this month)', 'Doctor', 'Appointments'],
      ...doctorWorkloadMonth.map((d) => [d.name, String(d.count)]),
      [],
      ['Simulated revenue (₹ thousands, demo)', 'Department', 'Revenue'],
      ...revenueByDepartment.map((d) => [d.name, String(d.revenue)]),
      [],
      ['OPD queue — token status', 'Status', 'Count (tokens)'],
      ...opdStatusPie.map((r) => [r.name, String(r.value)]),
      [],
      ['Beds — status mix', 'Status', 'Count (beds)'],
      ...bedStatusPie.map((r) => [r.name, String(r.value)]),
      [],
      ['Operational volume (snapshot)', 'Metric', 'Count'],
      ...volumeBarData.map((r) => [r.name, String(r.value)]),
      [],
      ['Appointments — by status', 'Status (label)', 'Count'],
      ...appointmentsByStatus.map((r) => [r.name, String(r.value)]),
      [],
      ['Beds by ward (stacked counts)', 'Ward', 'Available', 'Occupied', 'Reserved', 'Maintenance'],
      ...wardStackData.map((r) => [
        r.ward,
        String(r.Available),
        String(r.Occupied),
        String(r.Reserved),
        String(r.Maintenance),
      ]),
      [],
      [
        'Drug recall by drug class (OpenFDA)',
        'Use CSV on the Drug recall card (toolbar) — data is loaded there.',
      ],
    ]
    return rows
  }, [
    appointments,
    appointmentOutcomes,
    appointmentsByStatus,
    beds,
    bedOccupancySimulated,
    bedStatusPie,
    departmentPatientPie,
    doctorWorkloadMonth,
    doctors.length,
    importedDoctors,
    occupiedBeds,
    opdCurrentToken,
    opdQueue,
    opdServedToday,
    opdStatusPie,
    opdTrendFromAppointments,
    patientTotal,
    prescriptions,
    revenueByDepartment,
    volumeBarData,
    wardStackData,
  ])

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadCsv(`medicare-hms-report-${stamp}.csv`, buildCsvRows())
  }

  const handlePrint = useCallback(() => {
    window.dispatchEvent(new Event('resize'))
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
      setTimeout(() => window.print(), 250)
    })
  }, [])

  const printSingleReportChart = useCallback((chartId: string) => {
    document.querySelectorAll('[data-report-chart-id]').forEach((el) => {
      if (el.getAttribute('data-report-chart-id') !== chartId) {
        el.classList.add('report-print-chart-hidden-print')
      }
    })
    document.querySelectorAll('.report-print-skip-when-single').forEach((el) => {
      el.classList.add('report-print-chart-hidden-print')
    })
    document.documentElement.classList.add('report-print-single-mode')

    const onAfterPrint = () => {
      document.documentElement.classList.remove('report-print-single-mode')
      document.querySelectorAll('.report-print-chart-hidden-print').forEach((node) => {
        node.classList.remove('report-print-chart-hidden-print')
      })
      window.removeEventListener('afterprint', onAfterPrint)
    }
    window.addEventListener('afterprint', onAfterPrint)

    window.dispatchEvent(new Event('resize'))
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
      setTimeout(() => window.print(), 200)
    })
  }, [])

  const exportSingleReportChartCsv = useCallback(
    (chartId: string) => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const head = (): string[][] => [
        ['MediCare HMS — chart data export'],
        ['Chart', chartId],
        ['Generated', formatReportTimestamp()],
        [],
      ]
      let body: string[][] = []

      switch (chartId) {
        case REPORT_CHART_IDS.opdTrend30d:
          body = [
            ['Day label', 'Date key', 'Unique patients', 'Visits'],
            ...opdTrendFromAppointments.map((r) => [r.day, r.dayKey, String(r.patients), String(r.visits)]),
          ]
          break
        case REPORT_CHART_IDS.bedOcc30d:
          body = [['Day', 'Occupancy %'], ...bedOccupancySimulated.map((r) => [r.day, String(r.occupancy)])]
          break
        case REPORT_CHART_IDS.deptPatientPie:
          body = [
            ['Department', 'Patients (unique w/ booking)'],
            ...departmentPatientPie.map((d) => [d.name, String(d.value)]),
          ]
          break
        case REPORT_CHART_IDS.apptOutcomes:
          body = [
            ['Metric', 'Count'],
            ['Completed', String(appointmentOutcomes.completed)],
            ['Cancelled', String(appointmentOutcomes.cancelled)],
            ['No-show', String(appointmentOutcomes.noShow)],
          ]
          break
        case REPORT_CHART_IDS.doctorWorkload:
          body = [
            ['Doctor', 'Appointments (this month)'],
            ...doctorWorkloadMonth.map((d) => [d.name, String(d.count)]),
          ]
          break
        case REPORT_CHART_IDS.revenueSim:
          body = [
            ['Department', 'Revenue (₹ thousands, simulated)'],
            ...revenueByDepartment.map((d) => [d.name, String(d.revenue)]),
          ]
          break
        case REPORT_CHART_IDS.opdTokenPie:
          body = [['Token status', 'Count'], ...opdStatusPie.map((r) => [r.name, String(r.value)])]
          break
        case REPORT_CHART_IDS.bedStatusPie:
          body = [['Bed status', 'Count'], ...bedStatusPie.map((r) => [r.name, String(r.value)])]
          break
        case REPORT_CHART_IDS.volumeSnap:
          body = [['Metric', 'Count'], ...volumeBarData.map((r) => [r.name, String(r.value)])]
          break
        case REPORT_CHART_IDS.apptStatusBar:
          body = [
            ['Appointment status', 'Count'],
            ...appointmentsByStatus.map((r) => [r.name, String(r.value)]),
          ]
          break
        case REPORT_CHART_IDS.bedWardStack:
          body = [
            ['Ward', 'Available', 'Occupied', 'Reserved', 'Maintenance'],
            ...wardStackData.map((r) => [
              r.ward,
              String(r.Available),
              String(r.Occupied),
              String(r.Reserved),
              String(r.Maintenance),
            ]),
          ]
          break
        default:
          return
      }

      downloadCsv(`medicare-hms-${chartId}-${stamp}.csv`, [...head(), ...body])
    },
    [
      appointmentOutcomes,
      appointmentsByStatus,
      bedOccupancySimulated,
      bedStatusPie,
      departmentPatientPie,
      doctorWorkloadMonth,
      opdStatusPie,
      opdTrendFromAppointments,
      revenueByDepartment,
      volumeBarData,
      wardStackData,
    ],
  )

  const reportChartToolbar = (chartId: string) => (
    <>
      <ReportChartCsvButton chartId={chartId} onExport={exportSingleReportChartCsv} />
      <ReportChartPrintButton chartId={chartId} onPrint={printSingleReportChart} />
    </>
  )

  const pieFallback = (
    <p className="text-sm text-slate-500 dark:text-white py-12 text-center">No data for this chart.</p>
  )

  return (
    <div className="reports-print-root space-y-8">
      <MedicarePrintPageHeader
        documentLabel="Operational reports & analytics"
        detail="OPD, beds, appointments, prescriptions, trends."
      />

      <div className="no-print-report flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-white mb-2">
            Analytics
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reports &amp; analytics
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
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

      <div className="report-print-stat-grid report-print-skip-when-single grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Patients (registry)"
          value={patientTotal ?? '—'}
          subLabel={patientTotal == null ? '—' : 'Registry'}
          accent="blue"
          icon={<Users className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Imported NPI doctors"
          value={importedDoctors}
          subLabel="Schedule"
          accent="green"
          icon={<Stethoscope className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Beds occupied"
          value={`${occupiedBeds} / ${beds.length}`}
          subLabel="Wards"
          accent="amber"
          icon={<BedDouble className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="OPD tokens (session)"
          value={opdQueue.length}
          subLabel={`Now serving: ${opdCurrentToken != null ? formatOpdTokenLabel(opdCurrentToken) : '—'}`}
          accent="slate"
          icon={<ListOrdered className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Appointments"
          value={appointments.length}
          subLabel="Bookings"
          accent="blue"
          icon={<Calendar className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Prescriptions"
          value={prescriptions.length}
          subLabel="Rx"
          accent="green"
          icon={<FileText className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="report-print-charts space-y-6">
        <p className="no-print-report text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-white">
          Scheduling &amp; clinical analytics
        </p>
        <p className="report-print-skip-when-single hidden print:block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 border-b border-slate-400 pb-2">
          Trends, workload &amp; operational charts
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.opdTrend30d}>
            <DashboardCard
              title="OPD trend — unique patients per day (30d, from appointments)"
              actions={reportChartToolbar(REPORT_CHART_IDS.opdTrend30d)}
            >
            <div className="report-chart-host h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={opdTrendFromAppointments} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#64748b" interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="patients"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="Unique patients"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="Visits"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>
          </div>

          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.bedOcc30d}>
            <DashboardCard
              title="Bed occupancy over time (simulated %, 30d)"
              actions={reportChartToolbar(REPORT_CHART_IDS.bedOcc30d)}
            >
            <div className="report-chart-host h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bedOccupancySimulated} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#64748b" interval={4} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" unit="%" />
                  <Tooltip formatter={(v: unknown) => [`${v}%`, 'Occupancy']} />
                  <Area
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#7c3aed"
                    fill="url(#occFill)"
                    strokeWidth={2}
                    name="Occupancy %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.deptPatientPie}>
            <DashboardCard
              title="Department-wise patient distribution (unique patients with bookings)"
              actions={reportChartToolbar(REPORT_CHART_IDS.deptPatientPie)}
            >
            <div className="report-chart-host h-72">
              {departmentPatientPie.length === 0 ? (
                pieFallback
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentPatientPie}
                      cx="50%"
                      cy="50%"
                      innerRadius="42%"
                      outerRadius="68%"
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {departmentPatientPie.map((_, i) => (
                        <Cell key={i} fill={DEPT_PIE_COLORS[i % DEPT_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => [`${Number(value)} patients`, 'With booking']} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(v) => <span className="text-xs text-slate-600 dark:text-white">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </DashboardCard>
          </div>

          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.apptOutcomes}>
            <DashboardCard
              title="Appointment status — completed vs cancelled vs no-show (stacked)"
              actions={reportChartToolbar(REPORT_CHART_IDS.apptOutcomes)}
            >
            <div className="report-chart-host h-72">
              {appointmentOutcomes.completed + appointmentOutcomes.cancelled + appointmentOutcomes.noShow === 0 ? (
                pieFallback
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outcomeStackRow} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="o" fill={APPT_STATUS_COLORS.completed} name="Completed" />
                    <Bar dataKey="cancelled" stackId="o" fill={APPT_STATUS_COLORS.cancelled} name="Cancelled" />
                    <Bar dataKey="noShow" stackId="o" fill={APPT_STATUS_COLORS['no-show']} name="No-show" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </DashboardCard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.doctorWorkload}>
            <DashboardCard
              title="Doctor workload — appointments this month"
              actions={reportChartToolbar(REPORT_CHART_IDS.doctorWorkload)}
            >
            <div className="report-chart-host h-72">
              {doctorWorkloadMonth.length === 0 ? (
                pieFallback
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={doctorWorkloadMonth}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip formatter={(v: unknown) => [`${Number(v)} appts`, 'Count']} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </DashboardCard>
          </div>

          <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.revenueSim}>
            <DashboardCard
              title="Revenue summary (simulated ₹ thousands by department)"
              actions={reportChartToolbar(REPORT_CHART_IDS.revenueSim)}
            >
            <div className="report-chart-host h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDepartment} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" angle={-20} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" label={{ value: '₹k', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(v: unknown) => [`₹${Number(v)}k`, 'Simulated']} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue (₹k)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>
          </div>
        </div>

        <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.drugRecall}>
          <DrugRecallSummaryCard
            cardActions={<ReportChartPrintButton chartId={REPORT_CHART_IDS.drugRecall} onPrint={printSingleReportChart} />}
          />
        </div>
      </div>

      <div className="report-print-charts grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.opdTokenPie}>
          <DashboardCard
            title="OPD queue — token status"
            actions={reportChartToolbar(REPORT_CHART_IDS.opdTokenPie)}
          >
          <div className="report-chart-host h-72">
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
                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-white">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>
        </div>

        <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.bedStatusPie}>
          <DashboardCard
            title="Beds — status mix"
            actions={reportChartToolbar(REPORT_CHART_IDS.bedStatusPie)}
          >
          <div className="report-chart-host h-72">
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
                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-white">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>
        </div>
      </div>

      <div className="report-print-charts grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.volumeSnap}>
          <DashboardCard
            title="Operational volume (snapshot)"
            actions={reportChartToolbar(REPORT_CHART_IDS.volumeSnap)}
          >
          <div className="report-chart-host h-72">
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
        </div>

        <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.apptStatusBar}>
          <DashboardCard
            title="Appointments — by status"
            actions={reportChartToolbar(REPORT_CHART_IDS.apptStatusBar)}
          >
          <div className="report-chart-host h-72">
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
      </div>

      <div className="report-print-charts">
      <div className="report-chart-section" data-report-chart-id={REPORT_CHART_IDS.bedWardStack}>
        <DashboardCard
          title="Beds by ward (stacked)"
          actions={reportChartToolbar(REPORT_CHART_IDS.bedWardStack)}
        >
        <div className="report-chart-host h-80">
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
      </div>

      <MedicarePrintPageFooter />
    </div>
  )
}
