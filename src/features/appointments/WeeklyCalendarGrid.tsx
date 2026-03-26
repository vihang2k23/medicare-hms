import { format } from 'date-fns'
import { CalendarOff } from 'lucide-react'
import type { Appointment, ScheduleDoctor } from './types'
import { eachDayOfWeek, generateDaySlots } from './slotUtils'

interface WeeklyCalendarGridProps {
  weekStart: Date
  doctor: ScheduleDoctor
  appointments: Appointment[]
  onBookSlot: (date: string, slotStart: string, slotEnd: string) => void
  onOpenAppointment: (apt: Appointment) => void
}

export default function WeeklyCalendarGrid({
  weekStart,
  doctor,
  appointments,
  onBookSlot,
  onOpenAppointment,
}: WeeklyCalendarGridProps) {
  const days = eachDayOfWeek(weekStart)

  return (
    <div className="overflow-x-auto pb-2 -mx-1">
      <div className="grid grid-cols-7 gap-2 min-w-[840px] px-1">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const slots = generateDaySlots(day, doctor)
          const dayLabel = format(day, 'EEE')
          const dateLabel = format(day, 'd MMM')

          return (
            <div
              key={dateStr}
              className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/80 dark:bg-slate-900/40 flex flex-col min-h-[220px] ring-1 ring-slate-200/40 dark:ring-slate-700/40"
            >
              <div className="text-center py-2.5 px-2 border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/50 rounded-t-xl">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {dayLabel}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{dateLabel}</p>
              </div>
              <div className="flex flex-col gap-1.5 p-2 flex-1">
                {slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 dark:text-slate-500 py-6">
                    <CalendarOff className="h-6 w-6 mb-1 opacity-60" aria-hidden />
                    <span className="text-[11px]">No slots</span>
                  </div>
                ) : (
                  slots.map((s) => {
                    const apt = appointments.find(
                      (a) =>
                        a.doctorId === doctor.id &&
                        a.date === dateStr &&
                        a.slotStart === s.startStr &&
                        a.status !== 'cancelled' &&
                        a.status !== 'no-show',
                    )
                    if (apt) {
                      return (
                        <button
                          key={s.startStr}
                          type="button"
                          onClick={() => onOpenAppointment(apt)}
                          className="text-left rounded-lg px-2 py-2 text-xs font-medium bg-violet-500/15 text-violet-900 dark:text-violet-100 ring-1 ring-violet-500/25 hover:bg-violet-500/25 transition-colors"
                        >
                          <span className="font-mono tabular-nums">{s.startStr}</span>
                          <span className="block truncate mt-0.5 opacity-90">{apt.patientName}</span>
                          <span className="text-[10px] uppercase tracking-wide text-violet-700/80 dark:text-violet-300/90">
                            {apt.status}
                          </span>
                        </button>
                      )
                    }
                    return (
                      <button
                        key={s.startStr}
                        type="button"
                        onClick={() => onBookSlot(dateStr, s.startStr, s.endStr)}
                        className="rounded-lg px-2 py-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/15 ring-1 ring-emerald-500/20 transition-colors text-center"
                      >
                        {s.startStr} – {s.endStr}
                        <span className="block text-[10px] font-sans font-normal text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                          Book
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
