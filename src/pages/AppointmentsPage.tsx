import { useCallback, useEffect, useMemo, useState } from 'react'
import { addWeeks, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Printer } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../app/store'
import { useAuth } from '../shared/hooks/useAuth'
import {
  bookAppointment,
  cancelAppointment,
  findSchedulingConflict,
  rescheduleAppointment,
} from '../features/appointments/appointmentsSlice'
import WeeklyTimeGridCalendar from '../features/appointments/WeeklyTimeGridCalendar'
import { BookAppointmentModal, ManageAppointmentModal } from '../features/appointments/AppointmentDialogs'
import { isDateInWeek, startOfWeekMonday } from '../features/appointments/slotUtils'
import type { Appointment, ScheduleDoctor } from '../features/appointments/types'
import { notify } from '../shared/lib/notify'
import type { PatientRecord } from '../shared/types/patient'
import { scheduleDoctorIdForAuthUser } from '../shared/config/doctorScheduleMap'
import { SearchableIdPicker } from '../shared/ui/SearchWithDropdown'

export type AppointmentsVariant = 'admin' | 'receptionist' | 'doctor'

interface AppointmentsPageProps {
  variant?: AppointmentsVariant
}

export default function AppointmentsPage({ variant = 'admin' }: AppointmentsPageProps) {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const doctors = useSelector((s: RootState) => s.appointments.doctors)
  const appointments = useSelector((s: RootState) => s.appointments.appointments)

  const lockedDoctorId = variant === 'doctor' ? scheduleDoctorIdForAuthUser(user?.id) : null
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [pickedDoctorId, setPickedDoctorId] = useState('')
  const doctorId = lockedDoctorId ?? (pickedDoctorId || doctors[0]?.id || '')

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
      <div className="text-slate-600 dark:text-white text-sm">No doctor schedules loaded.</div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="no-print-appt">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-white mb-2">
          Scheduling
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {variant === 'doctor' ? 'My schedule' : 'Appointments'}
        </h1>
        <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-2xl leading-relaxed max-sm:text-xs">
          Week grid: time rows × Mon–Sun. Status colors on bookings. Drag to reschedule; click to open details.
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
            className="px-3 py-2 rounded-xl text-sm font-semibold text-sky-700 dark:text-white bg-sky-500/10 hover:bg-sky-500/20"
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
          <label className="relative inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white ml-0 sm:ml-2 min-w-0 cursor-pointer rounded-lg px-1 py-0.5 -mx-1 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 focus-within:ring-2 focus-within:ring-violet-400/60 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900">
            <input
              type="date"
              value={format(weekStart, 'yyyy-MM-dd')}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                setWeekStart(startOfWeekMonday(parseISO(v)))
              }}
              className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
              aria-label="Choose week to show in the schedule"
            />
            <CalendarDays
              className="pointer-events-none h-4 w-4 shrink-0 text-violet-500"
              aria-hidden
            />
            <span className="pointer-events-none truncate">{headerRange}</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={printSchedule}
            title="Print: disable browser headers/footers to omit the URL in PDFs."
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print week
          </button>
          {lockedDoctorId ? (
            <p className="text-sm text-slate-600 dark:text-white">
              <span className="font-medium text-slate-800 dark:text-white">{doctor.name}</span>
              <span className="text-slate-600 dark:text-slate-400 mx-1">·</span>
              {doctor.department}
            </p>
          ) : (
            <div className="w-full sm:w-auto sm:min-w-[16rem] sm:max-w-md">
              <SearchableIdPicker<ScheduleDoctor>
                id="appt-doctor"
                label="Doctor"
                items={doctors}
                selectedId={doctorId}
                onSelectId={setPickedDoctorId}
                getId={(d) => d.id}
                getLabel={(d) => `${d.name} · ${d.department}`}
                filterItem={(d, query) => {
                  const t = query.trim().toLowerCase()
                  if (!t) return true
                  return (
                    d.name.toLowerCase().includes(t) || d.department.toLowerCase().includes(t)
                  )
                }}
                placeholder="Search by name or department…"
                emptyLabel="Choose a doctor"
                accent="violet"
                allowClear={false}
                maxVisible={20}
              />
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
        <p className="no-print-appt text-xs text-slate-600 dark:text-slate-400">
          Data stored in this browser. Use <code className="font-mono text-[11px]">npm run server</code> for the patient
          list API.
        </p>
      )}
    </div>
  )
}
