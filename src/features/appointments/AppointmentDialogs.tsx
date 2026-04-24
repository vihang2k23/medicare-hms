import { useEffect, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { X } from 'lucide-react'
import type { PatientRecord } from '../../types/patient'
import { fetchPatients } from '../../services/patientsApi'
import { notify } from '../../utils/helpers'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from '../../utils/helpers'
import { ModalPortal } from '../../utils/helpers'
import { FieldError, FormInput } from '../../components/common'
import { SearchableIdPicker } from '../components/common'
import { filterLabeledOption } from '../../utils/helpers'
import type { Appointment, AppointmentStatus, ScheduleDoctor } from './types'
import { generateDaySlots } from './slotUtils'

// AppointmentDialogs defines the Appointment Dialogs UI surface and its primary interaction flow.
interface BookModalProps {
  open: boolean
  onClose: () => void
  doctor: ScheduleDoctor
  date: string
  slotStart: string
  slotEnd: string
  onConfirm: (patient: PatientRecord, reason: string, notes: string) => void
}

// BookAppointmentModal renders the appointment dialogs UI.
export function BookAppointmentModal(props: BookModalProps) {
  useModalScrollLock(props.open)
  if (!props.open) return null
  return <BookAppointmentModalOpen {...props} />
}

function BookAppointmentModalOpen({
  onClose,
  doctor,
  date,
  slotStart,
  slotEnd,
  onConfirm,
}: BookModalProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [patientId, setPatientId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [patientErr, setPatientErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPatients()
      .then((list) => {
        if (!cancelled) setPatients(list)
      })
      .catch(() => {
        notify.error('Could not load patients — start JSON Server or add patients first.')
        if (!cancelled) setPatients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = patients.find((p) => p.id === patientId)

  const submit = () => {
    if (!selected) {
      setPatientErr('Select a patient.')
      return
    }
    setPatientErr(null)
    onConfirm(selected, reason.trim(), notes.trim())
    onClose()
  }

  const dayLabel = format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE d MMM yyyy')

  return (
    <ModalPortal>
    <div className={modalFixedRoot('z-50')} role="dialog" aria-modal="true" aria-labelledby="book-apt-title">
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDim} aria-label="Close" onClick={onClose} />
        <div
          className="relative z-10 w-full max-w-md max-h-[min(90dvh,40rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80">
          <div>
            <h2 id="book-apt-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Book appointment
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {doctor.name} · {dayLabel}
            </p>
            <p className="text-sm font-mono text-sky-700 dark:text-white mt-1">
              {slotStart} – {slotEnd}
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
        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 touch-pan-y">
          <div>
            <SearchableIdPicker<PatientRecord>
              id="book-apt-patient"
              label="Patient"
              items={patients}
              selectedId={patientId}
              onSelectId={(id) => {
                setPatientId(id)
                if (!id) setPatientErr('Select a patient.')
                else setPatientErr(null)
              }}
              getId={(p) => p.id}
              getLabel={(p) => `${p.fullName} (${p.id})`}
              filterItem={(p, q) => {
                const t = q.trim().toLowerCase()
                if (!t) return true
                return p.fullName.toLowerCase().includes(t) || p.id.toLowerCase().includes(t)
              }}
              placeholder="Search patient…"
              emptyLabel={loading ? 'Loading…' : 'Select patient'}
              accent="sky"
              allowClear
              loading={loading}
              disabled={loading && patients.length === 0}
            />
            <FieldError>{patientErr}</FieldError>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-white mb-1">Reason</label>
            <FormInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Follow-up, new complaint"
              className="!py-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-white mb-1">Notes</label>
            <FormTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none !min-h-0 !py-2.5"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 text-white text-sm font-semibold shadow-md shadow-sky-500/20"
            >
              Confirm booking
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

interface ManageModalProps {
  open: boolean
  onClose: () => void
  appointment: Appointment | null
  doctor: ScheduleDoctor
  onReschedule: (date: string, slotStart: string, slotEnd: string) => void
  onCancel: () => void
  /** Doctors can reschedule their own bookings but cannot cancel visits from this UI. */
  scheduleRole?: 'doctor' | 'staff'
}

const FINAL_STATUSES: AppointmentStatus[] = ['completed', 'cancelled', 'no-show']

export function ManageAppointmentModal({
  open,
  onClose,
  appointment,
  doctor,
  onReschedule,
  onCancel,
  scheduleRole = 'staff',
}: ManageModalProps) {
  useModalScrollLock(open)
  if (!open || !appointment) return null
  return (
    <ManageAppointmentModalContent
      key={`${appointment.id}-${appointment.date}-${appointment.slotStart}-${appointment.slotEnd}`}
      onClose={onClose}
      appointment={appointment}
      doctor={doctor}
      onReschedule={onReschedule}
      onCancel={onCancel}
      scheduleRole={scheduleRole}
    />
  )
}

function ManageAppointmentModalContent({
  onClose,
  appointment,
  doctor,
  onReschedule,
  onCancel,
  scheduleRole,
}: Omit<ManageModalProps, 'open' | 'appointment'> & { appointment: Appointment }) {
  const [newDate, setNewDate] = useState(appointment.date)
  const [newSlot, setNewSlot] = useState(`${appointment.slotStart}|${appointment.slotEnd}`)
  const [slotErr, setSlotErr] = useState<string | null>(null)

  const slotOptions = useMemo(() => {
    if (!newDate) return []
    const day = parse(newDate, 'yyyy-MM-dd', new Date())
    return generateDaySlots(day, doctor).map((s) => ({
      value: `${s.startStr}|${s.endStr}`,
      label: `${s.startStr} – ${s.endStr}`,
    }))
  }, [newDate, doctor])

  const slotPickerRows = useMemo(
    () => [{ id: '', label: 'Select slot' }, ...slotOptions.map((o) => ({ id: o.value, label: o.label }))],
    [slotOptions],
  )

  const applyReschedule = () => {
    const [start, end] = newSlot.split('|')
    if (!start || !end) {
      setSlotErr('Choose a time slot.')
      return
    }
    setSlotErr(null)
    onReschedule(newDate, start, end)
    onClose()
  }

  const isFinalStatus = FINAL_STATUSES.includes(appointment.status)
  const canReschedule = !isFinalStatus
  const showStaffCancel = scheduleRole === 'staff' && !isFinalStatus

  return (
    <ModalPortal>
    <div className={modalFixedRoot('z-50')} role="dialog" aria-modal="true" aria-labelledby="manage-apt-title">
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDim} aria-label="Close" onClick={onClose} />
        <div
          className="relative z-10 w-full max-w-md max-h-[min(90dvh,40rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80">
          <div className="min-w-0 flex-1 pr-2 text-left">
            <h2 id="manage-apt-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Appointment
            </h2>
            <p className="text-sm font-medium text-slate-800 dark:text-white mt-1">{appointment.patientName}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {format(parse(appointment.date, 'yyyy-MM-dd', new Date()), 'EEE d MMM yyyy')} ·{' '}
              <span className="font-mono">
                {appointment.slotStart} – {appointment.slotEnd}
              </span>
            </p>
            <p className="text-xs text-violet-600 dark:text-white mt-1 uppercase tracking-wide">{appointment.status}</p>
            {appointment.reason ? (
              <p className="text-xs text-slate-600 dark:text-white mt-2">
                <span className="font-semibold">Reason:</span> {appointment.reason}
              </p>
            ) : null}
            {appointment.notes ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                <span className="font-semibold">Notes:</span> {appointment.notes}
              </p>
            ) : null}
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
        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 touch-pan-y">
          {isFinalStatus ? (
            <p className="rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              {appointment.status === 'completed'
                ? 'This visit is marked completed — it stays on your schedule for the record and can’t be moved or cancelled here.'
                : appointment.status === 'no-show'
                  ? 'This slot is marked no-show. Contact reception if you need to book a new time.'
                  : 'This appointment was cancelled. It stays visible as a record in the week grid.'}
            </p>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Reschedule</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-white mb-1">New date</label>
            <FormInput
              type="date"
              value={newDate}
              disabled={!canReschedule}
              onChange={(e) => {
                setNewDate(e.target.value)
                setNewSlot('')
                setSlotErr(null)
              }}
              className="!py-2.5"
            />
          </div>
          <div>
            <SearchableIdPicker<{ id: string; label: string }>
              id="manage-apt-slot"
              label="New slot"
              items={slotPickerRows}
              selectedId={newSlot}
              onSelectId={(id) => {
                setNewSlot(id)
                if (!id) setSlotErr('Choose a time slot.')
                else setSlotErr(null)
              }}
              getId={(o) => o.id}
              getLabel={(o) => o.label}
              filterItem={filterLabeledOption}
              placeholder="Search time slot…"
              emptyLabel="Select slot"
              accent="violet"
              allowClear={false}
              disabled={!canReschedule}
            />
            <FieldError>{slotErr}</FieldError>
          </div>
          <button
            type="button"
            onClick={applyReschedule}
            disabled={!canReschedule}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 disabled:opacity-40 text-white text-sm font-semibold"
          >
            Save new time
          </button>
          {showStaffCancel ? (
            <button
              type="button"
              onClick={() => {
                onCancel()
                onClose()
              }}
              className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-700 dark:text-white text-sm font-semibold"
            >
              Cancel appointment
            </button>
          ) : null}
        </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
