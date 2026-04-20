import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../store'
import { createInternalDoctor, findInternalDoctorByNpi, updateInternalDoctor } from '../services/internalDoctorsApi'
import { defaultImportedSchedule } from '../utils/npiRegistryApi'
import { notify } from '../utils/notify'
import { useModalScrollLock } from '../hooks/useModalScrollLock'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from './ui/modalOverlayClasses'
import { FieldError, FormInput } from './ui/form'
import { SearchableIdPicker } from './ui/SearchWithDropdown'
import { filterLabeledOption } from './ui/labeledOptionFilter'
import {
  addImportedScheduleDoctor,
  updateImportedScheduleDoctor,
} from '../domains/appointments/appointmentsSlice'
import { timeToMinutes } from '../domains/appointments/slotUtils'
import {
  createManualInternalRecord,
  internalRecordToScheduleDoctor,
  ISO_WEEKDAY_SHORT,
  type InternalDoctorRecord,
} from '../types/internalDoctor'

const SLOT_OPTIONS = [15, 20, 30] as const
const SLOT_ITEMS = SLOT_OPTIONS.map((m) => ({ id: String(m), label: `${m} minutes` }))
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

export interface InternalDoctorScheduleModalProps {
  open: boolean
  record: InternalDoctorRecord | null
  onClose: () => void
  onSaved: () => void
}

// InternalDoctorScheduleModal renders the internal doctor schedule modal UI.
export default function InternalDoctorScheduleModal({
  open,
  record,
  onClose,
  onSaved,
}: InternalDoctorScheduleModalProps) {
  useModalScrollLock(open)
  const dispatch = useDispatch<AppDispatch>()
  const isEdit = record != null
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [npiInput, setNpiInput] = useState('')
  const [phone, setPhone] = useState('')
  const [workingDays, setWorkingDays] = useState<Set<number>>(new Set())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<15 | 20 | 30>(30)
  const [hasLunch, setHasLunch] = useState(true)
  const [lunchStart, setLunchStart] = useState('13:00')
  const [lunchEnd, setLunchEnd] = useState('14:00')
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (record) {
      setName(record.name)
      setDepartment(record.department)
      setNpiInput(record.npi || '')
      setPhone(record.phone ?? '')
      setWorkingDays(new Set(record.workingDays))
      setStartTime(record.startTime)
      setEndTime(record.endTime)
      setSlotDurationMinutes(record.slotDurationMinutes)
      const has = Boolean(record.lunchBreakStart && record.lunchBreakEnd)
      setHasLunch(has)
      setLunchStart(record.lunchBreakStart ?? '13:00')
      setLunchEnd(record.lunchBreakEnd ?? '14:00')
      setFormErr(null)
    } else {
      const d = defaultImportedSchedule()
      setName('')
      setDepartment('')
      setNpiInput('')
      setPhone('')
      setWorkingDays(new Set(d.workingDays))
      setStartTime(d.startTime)
      setEndTime(d.endTime)
      setSlotDurationMinutes(d.slotDurationMinutes)
      setHasLunch(true)
      setLunchStart(d.lunchBreakStart ?? '13:00')
      setLunchEnd(d.lunchBreakEnd ?? '14:00')
      setFormErr(null)
    }
  }, [open, record])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleDay = (d: number) => {
    setFormErr(null)
    setWorkingDays((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Enter a provider name.'
    if (!department.trim()) return 'Enter a department.'
    if (workingDays.size < 1) return 'Select at least one working day.'
    const s0 = timeToMinutes(startTime)
    const e0 = timeToMinutes(endTime)
    if (s0 >= e0) return 'End time must be after start time.'
    if (hasLunch) {
      const ls = timeToMinutes(lunchStart)
      const le = timeToMinutes(lunchEnd)
      if (ls >= le) return 'Lunch end must be after lunch start.'
      if (ls < s0 || le > e0) return 'Lunch must fall within working hours.'
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      setFormErr(err)
      return
    }
    setFormErr(null)
    const daysArr = [...workingDays].sort((a, b) => a - b)
    const lunchS = hasLunch ? lunchStart.trim() : ''
    const lunchE = hasLunch ? lunchEnd.trim() : ''

    setSaving(true)
    try {
      if (!isEdit) {
        const rec = createManualInternalRecord({
          name,
          department,
          npi: npiInput,
          phone,
          workingDays: daysArr,
          startTime,
          endTime,
          slotDurationMinutes,
          lunchBreakStart: lunchS || undefined,
          lunchBreakEnd: lunchE || undefined,
        })
        if (rec.npi.length === 10) {
          const existing = await findInternalDoctorByNpi(rec.npi)
          if (existing) {
            setFormErr(`NPI ${rec.npi} is already in the directory.`)
            return
          }
        }
        await createInternalDoctor(rec)
        dispatch(addImportedScheduleDoctor(internalRecordToScheduleDoctor(rec)))
        notify.success(`${rec.name} added`)
      } else {
        const base = record
        const npiDigits = (npiInput ?? '').replace(/\D/g, '').slice(0, 10)
        const lockedNpi = base.source === 'npi' || base.id.startsWith('npi-')
        const nextNpi = lockedNpi ? base.npi : npiDigits
        if (nextNpi.length === 10) {
          const existing = await findInternalDoctorByNpi(nextNpi)
          if (existing && existing.id !== base.id) {
            setFormErr(`NPI ${nextNpi} is already used by another provider.`)
            return
          }
        }
        const updated: InternalDoctorRecord = {
          ...base,
          name: name.trim(),
          department: department.trim(),
          npi: nextNpi,
          phone: phone.trim() || undefined,
          workingDays: daysArr,
          startTime,
          endTime,
          slotDurationMinutes,
          lunchBreakStart: lunchS || undefined,
          lunchBreakEnd: lunchE || undefined,
        }
        await updateInternalDoctor(updated)
        dispatch(updateImportedScheduleDoctor(internalRecordToScheduleDoctor(updated)))
        notify.success('Schedule updated')
      }
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      setFormErr(msg)
      notify.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const modal = (
    <div className={modalFixedRoot('z-[100]')}>
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDim} aria-label="Close dialog" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="internal-doctor-schedule-title"
          className="relative z-10 w-full max-w-lg max-h-[min(90dvh,42rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200/60 dark:ring-slate-600/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80">
            <div className="min-w-0">
              <h2
                id="internal-doctor-schedule-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {isEdit ? 'Edit schedule' : 'Add manual doctor'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Set weekly hours, slot length, and lunch break. Used for appointment booking and the OPD queue.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 space-y-4 text-sm touch-pan-y">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Name
                </label>
                <FormInput
                  value={name}
                  onChange={(e) => {
                    setFormErr(null)
                    setName(e.target.value)
                  }}
                  className="!py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <FormInput
                  value={department}
                  onChange={(e) => {
                    setFormErr(null)
                    setDepartment(e.target.value)
                  }}
                  placeholder="e.g. General OPD, Cardiology"
                  className="!py-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  NPI (optional)
                </label>
                <FormInput
                  value={npiInput}
                  onChange={(e) => {
                    setFormErr(null)
                    setNpiInput(e.target.value)
                  }}
                  readOnly={record?.source === 'npi' || record?.id.startsWith('npi-')}
                  disabled={record?.source === 'npi' || record?.id.startsWith('npi-')}
                  className="!py-2 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Phone
                </label>
                <FormInput
                  value={phone}
                  onChange={(e) => {
                    setFormErr(null)
                    setPhone(e.target.value)
                  }}
                  className="!py-2"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Working days</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      workingDays.has(d)
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {ISO_WEEKDAY_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Day start
                </label>
                <FormInput
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setFormErr(null)
                    setStartTime(e.target.value)
                  }}
                  className="!py-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Day end
                </label>
                <FormInput
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setFormErr(null)
                    setEndTime(e.target.value)
                  }}
                  className="!py-2"
                />
              </div>
            </div>

            <div>
              <SearchableIdPicker<(typeof SLOT_ITEMS)[number]>
                id="internal-doc-slot-mins"
                label="Slot length"
                items={SLOT_ITEMS}
                selectedId={String(slotDurationMinutes)}
                onSelectId={(id) => {
                  setFormErr(null)
                  setSlotDurationMinutes(Number(id) as 15 | 20 | 30)
                }}
                getId={(x) => x.id}
                getLabel={(x) => x.label}
                filterItem={filterLabeledOption}
                placeholder="Search…"
                emptyLabel="Slot length"
                accent="sky"
                allowClear={false}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLunch}
                onChange={(e) => {
                  setFormErr(null)
                  setHasLunch(e.target.checked)
                }}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-slate-700 dark:text-white font-medium">Lunch break (no bookable slots)</span>
            </label>
            {hasLunch && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Lunch start
                  </label>
                  <FormInput
                    type="time"
                    value={lunchStart}
                    onChange={(e) => {
                      setFormErr(null)
                      setLunchStart(e.target.value)
                    }}
                    className="!py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Lunch end
                  </label>
                  <FormInput
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => {
                      setFormErr(null)
                      setLunchEnd(e.target.value)
                    }}
                    className="!py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 p-5 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40">
            <FieldError className="!mt-0">{formErr}</FieldError>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? 'Save changes' : 'Add doctor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
