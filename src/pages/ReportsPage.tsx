import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { RootState } from '../app/store'
import DashboardCard from '../components/ui/DashboardCard'
import StatCard from '../components/ui/StatCard'
import { fetchAllPatients } from '../api/patientsApi'
import { BedDouble, Calendar, FileText, ListOrdered, Stethoscope, Users } from 'lucide-react'

export default function ReportsPage() {
  const queue = useSelector((s: RootState) => s.queue)
  const beds = useSelector((s: RootState) => s.beds.beds)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const prescriptions = useSelector((s: RootState) => s.prescriptions.prescriptions)
  const [patientTotal, setPatientTotal] = useState<number | null>(null)

  useEffect(() => {
    void fetchAllPatients()
      .then((p) => setPatientTotal(p.length))
      .catch(() => setPatientTotal(null))
  }, [])

  const importedDoctors = doctors.filter((d) => d.source === 'npi').length
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length

  const chartData = useMemo(
    () => [
      { name: 'OPD tokens', value: queue.tokens.length },
      { name: 'Beds (total)', value: beds.length },
      { name: 'Appointments', value: appointments.length },
      { name: 'Prescriptions', value: prescriptions.length },
      { name: 'Schedule doctors', value: doctors.length },
    ],
    [queue.tokens.length, beds.length, appointments.length, prescriptions.length, doctors.length],
  )

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-2">
          Analytics
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Reports &amp; analytics
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Cross-module snapshot from live Redux state plus patient registry count from JSON Server when available.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <DashboardCard title="Operational volume (snapshot)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" interval={0} angle={-12} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </div>
  )
}
