import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus } from 'lucide-react'
import { useAuth } from '../../shared/hooks/useAuth'
import type { RootState } from '../../app/store'
import { fetchPatients } from '../../shared/api/patientsApi'
import type { PatientRecord } from '../../shared/types/patient'
import { notify } from '../../shared/lib/notify'
import type { AppDispatch } from '../../app/store'
import { addPrescription, newMedicineLine } from './prescriptionsSlice'
import type { PrescriptionMedicineLine } from './types'
import MedicineLineEditor from './MedicineLineEditor'

export type PrescriptionFormVariant = 'admin' | 'doctor'

interface PrescriptionFormProps {
  variant: PrescriptionFormVariant
  /** Pre-select patient from query string */
  initialPatientId?: string | null
  onSaved?: () => void
}

export default function PrescriptionForm({ variant, initialPatientId, onSaved }: PrescriptionFormProps) {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [patientId, setPatientId] = useState('')
  /** Admin enters Rx on behalf of this schedule doctor (not the admin account). */
  const [prescriberDoctorId, setPrescriberDoctorId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [medicines, setMedicines] = useState<PrescriptionMedicineLine[]>(() => [newMedicineLine()])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoadingPatients(true)
    try {
      const list = await fetchPatients()
      setPatients(list.filter((p) => p.isActive !== false))
    } catch {
      notify.error('Could not load patients — start JSON Server (`npm run server`).')
      setPatients([])
    } finally {
      setLoadingPatients(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (initialPatientId && patients.some((p) => p.id === initialPatientId)) {
      setPatientId(initialPatientId)
    }
  }, [initialPatientId, patients])

  useEffect(() => {
    if (variant !== 'admin') return
    setPrescriberDoctorId((prev) => {
      if (prev && doctors.some((d) => d.id === prev)) return prev
      return doctors[0]?.id ?? ''
    })
  }, [variant, doctors])

  const updateLine = (id: string, next: PrescriptionMedicineLine) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? next : m)))
  }

  const removeLine = (id: string) => {
    setMedicines((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== id)))
  }

  const addLine = () => setMedicines((prev) => [...prev, newMedicineLine()])

  const submit = () => {
    if (!user) return
    const patient = patients.find((p) => p.id === patientId)
    if (!patient) {
      notify.error('Select a patient.')
      return
    }
    if (variant === 'admin') {
      if (!prescriberDoctorId || !doctors.some((d) => d.id === prescriberDoctorId)) {
        notify.error('Select the prescribing physician.')
        return
      }
    }
    const lines = medicines.filter((m) => m.drugName.trim() && m.dosage.trim() && m.frequency.trim())
    if (lines.length === 0) {
      notify.error('Add at least one medicine with drug name, dosage, and frequency.')
      return
    }

    const prescriber =
      variant === 'admin'
        ? doctors.find((d) => d.id === prescriberDoctorId)!
        : { id: user.id, name: user.name }

    setSubmitting(true)
    try {
      dispatch(
        addPrescription({
          patientId: patient.id,
          patientName: patient.fullName,
          doctorId: prescriber.id,
          doctorName: prescriber.name,
          diagnosis: diagnosis.trim() || undefined,
          notes: notes.trim() || undefined,
          medicines: lines,
          status: 'active',
        }),
      )
      notify.success('Prescription saved.')
      setDiagnosis('')
      setNotes('')
      setMedicines([newMedicineLine()])
      onSaved?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-5 sm:p-6 shadow-sm ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">New prescription</h2>
          {variant === 'admin' ? (
            <p className="text-xs text-slate-500 dark:text-white mt-1 leading-relaxed">
              Admin: <span className="font-medium text-slate-700 dark:text-white">{user?.name}</span>. Attribution follows the{' '}
              <strong className="font-medium text-slate-600 dark:text-white">physician</strong> you select. Catalog lookup; recall alerts are
              illustrative.
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-white mt-1 leading-relaxed">
              Prescriber: <span className="font-medium text-slate-700 dark:text-white">{user?.name}</span>. Catalog lookup; recall alerts are
              illustrative.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {variant === 'admin' && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-1.5">
              Prescribing physician
            </label>
            <select
              value={prescriberDoctorId}
              onChange={(e) => setPrescriberDoctorId(e.target.value)}
              disabled={doctors.length === 0}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
            >
              {doctors.length === 0 ? (
                <option value="">No doctors in schedule</option>
              ) : (
                doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.department}
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-white mt-1.5">
              This name appears on the prescription, history, and printable PDF.
            </p>
          </div>
        )}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-1.5">
            Patient
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={loadingPatients}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
          >
            <option value="">{loadingPatients ? 'Loading patients…' : 'Select patient'}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-1.5">
            Diagnosis / indication (optional)
          </label>
          <input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute URI, Hypertension follow-up"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-1.5">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm resize-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Medicines</h3>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-800 dark:text-white hover:bg-violet-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </button>
        </div>
        {medicines.map((m) => (
          <MedicineLineEditor
            key={m.id}
            line={m}
            onChange={(next) => updateLine(m.id, next)}
            onRemove={() => removeLine(m.id)}
            canRemove={medicines.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save prescription'}
      </button>
    </div>
  )
}
