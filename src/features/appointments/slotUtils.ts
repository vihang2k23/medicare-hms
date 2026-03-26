import {
  addDays,
  addMinutes,
  format,
  getISODay,
  isAfter,
  isWithinInterval,
  parse,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import type { ScheduleDoctor } from './types'

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  return setMinutes(setHours(startOfDay(day), h), m || 0)
}

export interface GeneratedSlot {
  start: Date
  end: Date
  startStr: string
  endStr: string
}

/** Bookable slots for one calendar day and one doctor (skips lunch window). */
export function generateDaySlots(day: Date, doctor: ScheduleDoctor): GeneratedSlot[] {
  const dow = getISODay(day)
  if (!doctor.workingDays.includes(dow)) return []

  let cur = atTime(day, doctor.startTime)
  const endLimit = atTime(day, doctor.endTime)
  const lunchS = doctor.lunchBreakStart ? atTime(day, doctor.lunchBreakStart) : null
  const lunchE = doctor.lunchBreakEnd ? atTime(day, doctor.lunchBreakEnd) : null
  const step = doctor.slotDurationMinutes
  const out: GeneratedSlot[] = []

  while (!isAfter(addMinutes(cur, step), endLimit)) {
    const slotEnd = addMinutes(cur, step)
    if (lunchS && lunchE && cur.getTime() < lunchE.getTime() && slotEnd.getTime() > lunchS.getTime()) {
      cur = lunchE
      continue
    }
    out.push({
      start: cur,
      end: slotEnd,
      startStr: format(cur, 'HH:mm'),
      endStr: format(slotEnd, 'HH:mm'),
    })
    cur = slotEnd
  }
  return out
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(startOfDay(date), { weekStartsOn: 1 })
}

export function eachDayOfWeek(weekStartMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartMonday, i))
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** True if [aStart,aEnd) overlaps [bStart,bEnd) — strings HH:mm. */
export function slotsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart)
  const ae = timeToMinutes(aEnd)
  const bs = timeToMinutes(bStart)
  const be = timeToMinutes(bEnd)
  return as < be && ae > bs
}

/** `dateStr` is YYYY-MM-DD; week is Mon–Sun from `weekStartMonday`. */
export function isDateInWeek(dateStr: string, weekStartMonday: Date): boolean {
  const d = startOfDay(parse(dateStr, 'yyyy-MM-dd', new Date()))
  const start = startOfDay(weekStartMonday)
  const end = startOfDay(addDays(weekStartMonday, 6))
  return isWithinInterval(d, { start, end })
}

/** Unique slot start times (HH:mm) that appear any day this week for this doctor — sorted. */
export function weekSlotStartLabels(weekStartMonday: Date, doctor: ScheduleDoctor): string[] {
  const set = new Set<string>()
  for (const day of eachDayOfWeek(weekStartMonday)) {
    for (const s of generateDaySlots(day, doctor)) {
      set.add(s.startStr)
    }
  }
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

export function findSlotByStart(day: Date, doctor: ScheduleDoctor, startStr: string): GeneratedSlot | undefined {
  return generateDaySlots(day, doctor).find((s) => s.startStr === startStr)
}
