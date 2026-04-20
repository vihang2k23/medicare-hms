import { parseISO } from 'date-fns'
import type { ScheduleDoctor } from '../types'
import {
  eachDayOfWeek,
  findSlotByStart,
  generateDaySlots,
  isDateInWeek,
  slotsOverlap,
  startOfWeekMonday,
  timeToMinutes,
  weekSlotStartLabels,
} from '../slotUtils'

const doctorWithLunch: ScheduleDoctor = {
  id: 'DL',
  name: 'Lunch',
  department: 'General OPD',
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '12:00',
  slotDurationMinutes: 30,
  lunchBreakStart: '09:45',
  lunchBreakEnd: '10:15',
}

const doctorNoLunch: ScheduleDoctor = {
  id: 'NL',
  name: 'No lunch',
  department: 'General OPD',
  workingDays: [2, 4, 6],
  startTime: '09:00',
  endTime: '10:00',
  slotDurationMinutes: 30,
}

describe('timeToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(timeToMinutes('09:00')).toBe(540)
    expect(timeToMinutes('09:05')).toBe(545)
  })

  it('treats missing minutes as zero', () => {
    expect(timeToMinutes('10')).toBe(600)
  })
})

describe('generateDaySlots', () => {
  it('returns no slots on a non-working weekday', () => {
    const sunday = parseISO('2026-04-12')
    expect(generateDaySlots(sunday, doctorWithLunch)).toEqual([])
  })

  it('emits slots and skips the lunch window', () => {
    const monday = parseISO('2026-04-13')
    const slots = generateDaySlots(monday, doctorWithLunch)
    const starts = slots.map((s) => s.startStr)
    expect(starts).toContain('09:00')
    // 09:30–10:00 crosses lunch (09:45–10:15), so generation jumps to 10:15
    expect(starts).not.toContain('09:30')
    expect(starts).not.toContain('09:45')
    expect(starts).toContain('10:15')
    expect(starts).toContain('10:45')
  })

  it('covers a working day without lunch breaks', () => {
    const tuesday = parseISO('2026-04-14')
    const slots = generateDaySlots(tuesday, doctorNoLunch)
    expect(slots.map((s) => `${s.startStr}-${s.endStr}`)).toEqual(['09:00-09:30', '09:30-10:00'])
  })
})

describe('startOfWeekMonday / eachDayOfWeek', () => {
  it('anchors the week on Monday', () => {
    const wed = parseISO('2026-04-15')
    const mon = startOfWeekMonday(wed)
    expect(mon.getDay()).toBe(1)
    const days = eachDayOfWeek(mon)
    expect(days).toHaveLength(7)
    expect(days[0]!.toDateString()).toBe(mon.toDateString())
  })
})

describe('isDateInWeek', () => {
  it('returns true for dates inside Mon–Sun', () => {
    const weekStart = parseISO('2026-04-13')
    expect(isDateInWeek('2026-04-13', weekStart)).toBe(true)
    expect(isDateInWeek('2026-04-19', weekStart)).toBe(true)
  })

  it('returns false outside the week', () => {
    const weekStart = parseISO('2026-04-13')
    expect(isDateInWeek('2026-04-12', weekStart)).toBe(false)
    expect(isDateInWeek('2026-04-20', weekStart)).toBe(false)
  })
})

describe('weekSlotStartLabels', () => {
  it('collects unique sorted start labels for the week', () => {
    const mon = parseISO('2026-04-13')
    const labels = weekSlotStartLabels(mon, doctorWithLunch)
    expect(labels[0]).toBe('09:00')
    expect(labels).toEqual([...labels].sort((a, b) => timeToMinutes(a) - timeToMinutes(b)))
  })
})

describe('findSlotByStart', () => {
  it('returns the slot with matching startStr', () => {
    const mon = parseISO('2026-04-13')
    const hit = findSlotByStart(mon, doctorWithLunch, '09:00')
    expect(hit?.endStr).toBe('09:30')
  })

  it('returns undefined when missing', () => {
    const mon = parseISO('2026-04-13')
    expect(findSlotByStart(mon, doctorWithLunch, '23:59')).toBeUndefined()
  })
})

describe('slotsOverlap (extra)', () => {
  it('treats touching boundaries as non-overlap', () => {
    expect(slotsOverlap('09:30', '10:00', '10:00', '10:30')).toBe(false)
  })
})
