import { useEffect, useState } from 'react'
import { Activity, Heart, Thermometer, Wind, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from '../ui/modalOverlayClasses'
import { createVital } from '../../api/vitalsApi'
import type { PatientRecord } from '../../types/patient'
import { notify } from '../../lib/notify'

function parseOptInt(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : undefined
}

function parseOptFloat(raw: string): number | undefined {
  const t = raw.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

const fieldInput =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm shadow-slate-200/20 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400/50 transition-[box-shadow,border-color]'

export interface VitalsRecordModalProps {
  open: boolean
  patient: PatientRecord | null
  onClose: () => void
  /** Called after a successful save (refetch vitals in parent). */
  onSaved: () => void | Promise<void>
}

export default function VitalsRecordModal({ open, patient, onClose, onSaved }: VitalsRecordModalProps) {
  useModalScrollLock(open && !!patient)
  const { user } = useAuth()
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [temp, setTemp] = useState('')
  const [spo2, setSpo2] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSys('')
    setDia('')
    setPulse('')
    setTemp('')
    setSpo2('')
    setNotes('')
  }, [open, patient?.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !patient) return null

  const handleClose = () => {
    onClose()
  }

  const submit = async () => {
    const systolic = parseOptInt(sys)
    const diastolic = parseOptInt(dia)
    const pulseN = parseOptInt(pulse)
    const tempN = parseOptFloat(temp)
    const spo2N = parseOptInt(spo2)

    const hasAny =
      systolic != null ||
      diastolic != null ||
      pulseN != null ||
      tempN != null ||
      spo2N != null ||
      notes.trim().length > 0
    if (!hasAny) {
      notify.error('Enter at least one vital sign or a note.')
      return
    }

    setSaving(true)
    try {
      await createVital({
        patientId: patient.id,
        systolic,
        diastolic,
        pulse: pulseN,
        tempC: tempN,
        spo2: spo2N,
        notes: notes.trim() || undefined,
        recordedBy: user?.name,
      })
      notify.success('Vitals saved')
      await onSaved()
      handleClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={modalFixedRoot('z-[100]')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vitals-record-modal-title"
    >
      <div className={modalFixedInner}>
        <button
          type="button"
          className={modalBackdropDim}
          aria-label="Close vitals form"
          onClick={handleClose}
        />
        <div className="relative z-10 w-full max-w-xl max-h-[min(90dvh,44rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/25 dark:shadow-black/40 ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden overscroll-contain">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200/90 dark:border-slate-700/90 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Record vitals</p>
            <h2 id="vitals-record-modal-title" className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Enter vitals
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              {patient.fullName}{' '}
              <span className="font-mono text-sky-600 dark:text-sky-400">({patient.id})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 py-5 space-y-5 flex-1 min-h-0 touch-pan-y">
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/25 p-4 space-y-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" strokeWidth={2.5} aria-hidden />
              Blood pressure
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Systolic</label>
                <input
                  inputMode="numeric"
                  value={sys}
                  onChange={(e) => setSys(e.target.value)}
                  placeholder="mmHg"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Diastolic</label>
                <input
                  inputMode="numeric"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  placeholder="mmHg"
                  className={fieldInput}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/60 dark:bg-slate-800/25 p-4 space-y-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-sky-500 shrink-0" strokeWidth={2.5} aria-hidden />
                <Thermometer className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} aria-hidden />
              </span>
              Pulse, temperature &amp; oxygen
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Pulse</label>
                <input
                  inputMode="numeric"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  placeholder="bpm"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Temp °C</label>
                <input
                  inputMode="decimal"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  placeholder="36.8"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">SpO₂ %</label>
                <input
                  inputMode="numeric"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  placeholder="98"
                  className={fieldInput}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Optional context for the care team"
              className={`${fieldInput} resize-y min-h-[6rem]`}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200/90 dark:border-slate-700/90 px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-md shadow-orange-600/25"
          >
            <Activity className="h-4 w-4 shrink-0" aria-hidden />
            {saving ? 'Saving…' : 'Save vitals'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
