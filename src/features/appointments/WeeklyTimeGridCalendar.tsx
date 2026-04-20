import { useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { GripVertical } from 'lucide-react'
import MediCareLogo from '../../components/ui/brand/MediCareLogo'
import type { Appointment, AppointmentStatus, ScheduleDoctor } from './types'
import { appointmentStatusClasses } from '../../domains/appointments/appointmentStatusStyles'
import { eachDayOfWeek, findSlotByStart, weekSlotStartLabels } from './slotUtils'

// WeeklyTimeGridCalendar defines the Weekly Time Grid Calendar UI surface and its primary interaction flow.
const MIME = 'application/x-medicare-appointment-id'

interface WeeklyTimeGridCalendarProps {
  weekStart: Date
  doctor: ScheduleDoctor
  appointments: Appointment[]
  onBookSlot: (date: string, slotStart: string, slotEnd: string) => void
  onOpenAppointment: (apt: Appointment) => void
  /** Drag-drop reschedule: same checks as modal (parent runs conflict detection). */
  onDropReschedule: (
    appointmentId: string,
    targetDate: string,
    slotStart: string,
    slotEnd: string,
  ) => boolean
}

function appointmentsForCell(
  list: Appointment[],
  doctorId: string,
  dateStr: string,
  slotStart: string,
): Appointment[] {
  return list.filter(
    (a) =>
      a.doctorId === doctorId &&
      a.date === dateStr &&
      a.slotStart === slotStart &&
      a.status !== 'cancelled' &&
      a.status !== 'no-show',
  )
}

function canDrag(status: AppointmentStatus): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'no-show'
}

// WeeklyTimeGridCalendar renders the weekly time grid calendar UI.
export default function WeeklyTimeGridCalendar({
  weekStart,
  doctor,
  appointments,
  onBookSlot,
  onOpenAppointment,
  onDropReschedule,
}: WeeklyTimeGridCalendarProps) {
  const days = useMemo(() => eachDayOfWeek(weekStart), [weekStart])
  const rowLabels = useMemo(() => weekSlotStartLabels(weekStart, doctor), [weekStart, doctor])
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData(MIME, id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragEnd = useCallback(() => setDragOverKey(null), [])

  return (
    <div className="appt-print-light weekly-schedule-print-root rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 overflow-hidden ring-1 ring-slate-200/40 dark:ring-slate-700/40 shadow-sm">
      <div className="print-only-banner appt-print-header px-5 py-4 border-b-2 border-slate-400 text-slate-900">
        <div className="flex items-start gap-4">
          <div className="appt-print-logo-wrap shrink-0 rounded-xl border-2 border-sky-600/30 bg-white p-1">
            <MediCareLogo size="lg" title={false} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">MediCare HMS</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">Weekly schedule</p>
            <p className="text-sm text-slate-700 leading-snug">
              <span className="font-semibold text-slate-900">{doctor.name}</span>
              <span className="text-slate-500"> · </span>
              <span>{doctor.department}</span>
            </p>
            <p className="text-xs text-slate-600">Week of {format(weekStart, 'EEEE, d MMMM yyyy')}</p>
            <p className="appt-print-legend text-[10px] text-slate-600 pt-2 border-t border-slate-300 mt-3 leading-relaxed">
              Legend: Scheduled · Confirmed · In progress · Completed · Cancelled · No-show (shaded blocks below).
            </p>
          </div>
        </div>
      </div>

      <div className="appt-weekly-scroll overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="appt-weekly-table w-full min-w-[720px] sm:min-w-[920px] border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-30 w-16 sm:w-20 px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-r border-slate-200/90 dark:border-slate-700/90"
              >
                Time
              </th>
              {days.map((day) => {
                const ds = format(day, 'yyyy-MM-dd')
                return (
                  <th
                    key={ds}
                    scope="col"
                    className="px-1 py-3 text-center border-b border-slate-200/90 dark:border-slate-700/90 bg-slate-50/90 dark:bg-slate-800/60"
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {format(day, 'EEE')}
                    </span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      {format(day, 'd MMM')}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((timeLabel) => (
              <tr key={timeLabel} className="border-b border-slate-100 dark:border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 z-20 px-2 py-2 font-mono text-xs font-semibold text-slate-600 dark:text-white bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200/90 dark:border-slate-700/90 align-top"
                >
                  {timeLabel}
                </th>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const slot = findSlotByStart(day, doctor, timeLabel)
                  const cellKey = `${dateStr}|${timeLabel}`
                  const apts = appointmentsForCell(appointments, doctor.id, dateStr, timeLabel)
                  const isDragOver = dragOverKey === cellKey

                  if (!slot) {
                    return (
                      <td
                        key={cellKey}
                        className="p-1 align-top min-h-[3.25rem] bg-slate-100/40 dark:bg-slate-800/20 border-l border-slate-100/80 dark:border-slate-800/50"
                      />
                    )
                  }

                  if (apts.length === 0) {
                    return (
                      <td
                        key={cellKey}
                        className={`p-1 align-top min-h-[3.25rem] border-l border-slate-100/80 dark:border-slate-800/50 ${
                          isDragOver ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50 ring-inset' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onBookSlot(dateStr, slot.startStr, slot.endStr)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverKey(cellKey)
                          }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOverKey(null)
                            const id = e.dataTransfer.getData(MIME)
                            if (!id) return
                            onDropReschedule(id, dateStr, slot.startStr, slot.endStr)
                          }}
                          className="appt-empty-slot-btn w-full min-h-[3rem] rounded-lg border border-dashed border-emerald-400/50 dark:border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/10 text-[11px] text-emerald-800 dark:text-white font-medium transition-colors flex flex-col items-center justify-center gap-0.5"
                        >
                          <span className="font-mono opacity-80 appt-empty-slot-time">
                            {slot.startStr}–{slot.endStr}
                          </span>
                          <span className="appt-empty-slot-hint">Book / drop here</span>
                        </button>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={cellKey}
                      className={`p-1 align-top min-h-[3.25rem] border-l border-slate-100/80 dark:border-slate-800/50 ${
                        isDragOver ? 'bg-amber-500/15 ring-2 ring-amber-400/40 ring-inset' : ''
                      }`}
                      onDragOver={(e) => {
                        if (apts.length >= 1) return
                        e.preventDefault()
                        setDragOverKey(cellKey)
                      }}
                      onDragLeave={() => setDragOverKey(null)}
                    >
                      <div
                        className={`flex flex-wrap gap-1 ${apts.length > 1 ? 'justify-start' : ''}`}
                        style={{ minHeight: '2.75rem' }}
                      >
                        {apts.map((apt) => {
                          const drag = canDrag(apt.status)
                          return (
                            <div
                              key={apt.id}
                              role="button"
                              tabIndex={0}
                              draggable={drag}
                              onDragStart={(e) => drag && onDragStart(e, apt.id)}
                              onDragEnd={onDragEnd}
                              onClick={() => onOpenAppointment(apt)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  onOpenAppointment(apt)
                                }
                              }}
                              data-apt-status={apt.status}
                              className={`appt-booking-card relative flex-1 min-w-[5.5rem] max-w-full rounded-lg border px-2 py-1.5 text-left text-xs font-medium ring-1 cursor-pointer select-none transition-shadow hover:shadow-md ${appointmentStatusClasses(apt.status)} ${
                                drag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                              }`}
                            >
                              {drag && (
                                <span
                                  className="no-print-appt absolute top-1 right-1 text-slate-600 dark:text-slate-400 pointer-events-none"
                                  title="Drag to reschedule"
                                >
                                  <GripVertical className="h-3.5 w-3.5" aria-hidden />
                                </span>
                              )}
                              <span className="block font-mono text-[10px] opacity-80 pr-4">
                                {apt.slotStart}–{apt.slotEnd}
                              </span>
                              <span className="block truncate font-semibold">{apt.patientName}</span>
                              <span className="block text-[10px] uppercase tracking-wide opacity-80">
                                {apt.status}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="no-print-appt px-4 py-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-700/80">
        Status colors: scheduled (blue), confirmed (green), in progress (amber), completed (gray). Drag a card
        onto an empty slot to reschedule. Click a card for details.
      </p>
    </div>
  )
}
