import { useCallback, useEffect, useMemo, useState } from 'react'
import { addWeeks, format } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Printer } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../app/store'
import { useAuth } from '../hooks/useAuth'
import {
  bookAppointment,
  cancelAppointment,
  findSchedulingConflict,
  rescheduleAppointment,
} from '../features/appointments/appointmentsSlice'
import WeeklyTimeGridCalendar from '../features/appointments/WeeklyTimeGridCalendar'
import { BookAppointmentModal, ManageAppointmentModal } from '../features/appointments/AppointmentDialogs'
import { isDateInWeek, startOfWeekMonday } from '../features/appointments/slotUtils'
import type { Appointment } from '../features/appointments/types'
import { notify } from '../lib/notify'
import type { PatientRecord } from '../types/patient'

/** Demo: map logged-in doctor user to seeded schedule id */
const DEMO_USER_DOCTOR_ID: Record<string, string> = {
  DOC001: 'D1',
}

export type AppointmentsVariant = 'admin' | 'receptionist' | 'doctor'

interface AppointmentsPageProps {
  variant?: AppointmentsVariant
}

export default function AppointmentsPage({ variant = 'admin' }: AppointmentsPageProps) {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)

  const lockedDoctorId = variant === 'doctor' ? (DEMO_USER_DOCTOR_ID[user?.id ?? ''] ?? 'D1') : null
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [doctorId, setDoctorId] = useState(() => lockedDoctorId ?? doctors[0]?.id ?? '')

  useEffect(() => {
    if (lockedDoctorId) setDoctorId(lockedDoctorId)
  }, [lockedDoctorId])

  /** Enables @media print rules that hide nav/sidebar (same pattern as Reports). */
  useEffect(() => {
    document.documentElement.classList.add('appointments-print-route')
    return () => document.documentElement.classList.remove('appointments-print-route')
  }, [])

  const doctor = doctors.find((d) => d.id === doctorId)
  const weekApts = useMemo(
    () => appointments.filter((a) => a.doctorId === doctorId && isDateInWeek(a.date, weekStart)),
    [appointments, doctorId, weekStart],
  )

  const [bookOpen, setBookOpen] = useState(false)
  const [bookCtx, setBookCtx] = useState({ date: '', slotStart: '', slotEnd: '' })
  const [manageOpen, setManageOpen] = useState(false)
  const [activeApt, setActiveApt] = useState<Appointment | null>(null)

  const rangeEnd = new Date(weekStart)
  rangeEnd.setDate(rangeEnd.getDate() + 6)
  const headerRange = `${format(weekStart, 'd MMM')} – ${format(rangeEnd, 'd MMM yyyy')}`

  const openBook = (date: string, slotStart: string, slotEnd: string) => {
    if (!doctor) return
    const hit = findSchedulingConflict(appointments, doctor.id, date, slotStart, slotEnd)
    if (hit) {
      notify.error('This slot is no longer available (conflict). Refresh and pick another time.')
      return
    }
    setBookCtx({ date, slotStart, slotEnd })
    setBookOpen(true)
  }

  const confirmBook = (patient: PatientRecord, reason: string, notes: string) => {
    if (!doctor) return
    const { date, slotStart, slotEnd } = bookCtx
    const conflict = findSchedulingConflict(appointments, doctor.id, date, slotStart, slotEnd)
    if (conflict) {
      notify.error('Conflict: another booking exists for this doctor and time.')
      return
    }
    dispatch(
      bookAppointment({
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.department,
        date,
        slotStart,
        slotEnd,
        status: 'scheduled',
        reason: reason || undefined,
        notes: notes || undefined,
      }),
    )
    notify.success(`Booked ${patient.fullName} · ${date} ${slotStart}`)
  }

  const openManage = (apt: Appointment) => {
    setActiveApt(apt)
    setManageOpen(true)
  }

  const manageDoctor = activeApt ? doctors.find((d) => d.id === activeApt.doctorId) : undefined

  const applyReschedule = (date: string, slotStart: string, slotEnd: string) => {
    if (!activeApt || !manageDoctor) return
    const conflict = findSchedulingConflict(
      appointments,
      activeApt.doctorId,
      date,
      slotStart,
      slotEnd,
      activeApt.id,
    )
    if (conflict) {
      notify.error('That time conflicts with another appointment for this doctor.')
      return
    }
    dispatch(rescheduleAppointment({ id: activeApt.id, date, slotStart, slotEnd }))
    notify.success('Appointment rescheduled')
  }

  const handleDropReschedule = useCallback(
    (appointmentId: string, targetDate: string, slotStart: string, slotEnd: string): boolean => {
      if (!doctor) return false
      const apt = appointments.find((a) => a.id === appointmentId)
      if (!apt || apt.doctorId !== doctor.id) return false
      if (apt.date === targetDate && apt.slotStart === slotStart) {
        notify.error('Already at this time.')
        return false
      }
      const conflict = findSchedulingConflict(
        appointments,
        doctor.id,
        targetDate,
        slotStart,
        slotEnd,
        appointmentId,
      )
      if (conflict) {
        notify.error('Cannot move here — that slot is already booked.')
        return false
      }
      dispatch(rescheduleAppointment({ id: appointmentId, date: targetDate, slotStart, slotEnd }))
      notify.success('Appointment moved')
      return true
    },
    [appointments, doctor, dispatch],
  )

  /** Main-tab print so “Save as PDF” does not show about:blank in headers/footers (browser uses this page URL). */
  const printSchedule = () => {
    window.print()
  }

  if (!doctor) {
    return (
      <div className="text-slate-600 dark:text-slate-400 text-sm">No doctor schedules loaded.</div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="no-print-appt">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-2">
          Scheduling
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {variant === 'doctor' ? 'My schedule' : 'Appointments'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed max-sm:text-xs">
          Custom week view: <strong className="font-medium text-slate-700 dark:text-slate-200">time rows</strong>{' '}
          × <strong className="font-medium text-slate-700 dark:text-slate-200">Mon–Sun</strong> columns (date-fns, no
          calendar library). Appointments are color-coded by status.{' '}
          <strong className="font-medium text-slate-700 dark:text-slate-200">Drag</strong> a booking onto an empty slot
          to reschedule; click for full detail, modal reschedule, or cancel.
        </p>
      </div>

      <div className="no-print-appt flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 ml-0 sm:ml-2 min-w-0">
            <CalendarDays className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            <span className="truncate">{headerRange}</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={printSchedule}
            title="Tip: in the print dialog, turn off Headers and footers to hide the page URL on PDFs."
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print week
          </button>
          {lockedDoctorId ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{doctor.name}</span>
              <span className="text-slate-400 mx-1">·</span>
              {doctor.department}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="appt-doctor" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Doctor
              </label>
              <select
                id="appt-doctor"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full sm:w-auto sm:min-w-[12rem] px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.department}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <WeeklyTimeGridCalendar
        weekStart={weekStart}
        doctor={doctor}
        appointments={weekApts}
        onBookSlot={openBook}
        onOpenAppointment={openManage}
        onDropReschedule={handleDropReschedule}
      />

      <BookAppointmentModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        doctor={doctor}
        date={bookCtx.date}
        slotStart={bookCtx.slotStart}
        slotEnd={bookCtx.slotEnd}
        onConfirm={confirmBook}
      />

      <ManageAppointmentModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        appointment={activeApt}
        doctor={manageDoctor ?? doctor}
        onReschedule={applyReschedule}
        onCancel={() => {
          if (activeApt) {
            dispatch(cancelAppointment(activeApt.id))
            notify.success('Appointment cancelled')
          }
        }}
      />

      {variant !== 'doctor' && (
        <p className="no-print-appt text-xs text-slate-500 dark:text-slate-400">
          Bookings are saved in this browser ({`localStorage`}). Run{' '}
          <code className="font-mono text-[11px]">npm run server</code> to load patients for the dropdown.
        </p>
      )}
    </div>
  )
}
