/**
 * Static/mock data for dashboard widgets and Recharts.
 * Replace with API/JSON Server later.
 */

export const MOCK_PATIENTS_TODAY = 42
export const MOCK_REGISTRATIONS_TODAY = 18
export const MOCK_PRESCRIPTIONS_TODAY = 12
export const MOCK_SERVED_TODAY = 28

/** Bed occupancy: [available, occupied, reserved, maintenance] */
export const MOCK_BED_OCCUPANCY = [
  { name: 'Available', value: 24, color: '#22c55e' },
  { name: 'Occupied', value: 18, color: '#ef4444' },
  { name: 'Reserved', value: 5, color: '#f59e0b' },
  { name: 'Maintenance', value: 3, color: '#64748b' },
]

export const MOCK_OPD_BY_STATUS = [
  { name: 'Waiting', value: 8, color: '#3b82f6' },
  { name: 'In Progress', value: 1, color: '#f59e0b' },
  { name: 'Done', value: 28, color: '#22c55e' },
]

/** Revenue / billing summary (last 7 days) */
export const MOCK_REVENUE_DATA = [
  { day: 'Mon', amount: 12400 },
  { day: 'Tue', amount: 15800 },
  { day: 'Wed', amount: 13200 },
  { day: 'Thu', amount: 18900 },
  { day: 'Fri', amount: 22100 },
  { day: 'Sat', amount: 9800 },
  { day: 'Sun', amount: 7600 },
]

/** Top departments by patient load */
export const MOCK_TOP_DEPARTMENTS = [
  { name: 'General Medicine', patients: 85 },
  { name: 'Pediatrics', patients: 62 },
  { name: 'Orthopedics', patients: 48 },
  { name: 'Cardiology', patients: 41 },
  { name: 'Dermatology', patients: 33 },
]

/** Doctor availability (for admin widget) */
export const MOCK_DOCTOR_AVAILABILITY = [
  { id: 'D1', name: 'Dr. Sharma', dept: 'General', status: 'available' },
  { id: 'D2', name: 'Dr. Patel', dept: 'Pediatrics', status: 'busy' },
  { id: 'D3', name: 'Dr. Kumar', dept: 'Ortho', status: 'available' },
  { id: 'D4', name: 'Dr. Nair', dept: 'Cardiology', status: 'busy' },
  { id: 'D5', name: 'Dr. Reddy', dept: 'General', status: 'available' },
]

/** Today's appointments (doctor dashboard) */
export const MOCK_TODAY_APPOINTMENTS = [
  { id: 'A1', patientName: 'Raj Mehta', time: '09:00', status: 'completed' },
  { id: 'A2', patientName: 'Priya Shah', time: '09:30', status: 'completed' },
  { id: 'A3', patientName: 'Amit Kumar', time: '10:00', status: 'in-progress' },
  { id: 'A4', patientName: 'Sneha Patel', time: '10:30', status: 'waiting' },
  { id: 'A5', patientName: 'Vikram Singh', time: '11:00', status: 'waiting' },
]

export const MOCK_NEXT_PATIENT = { name: 'Amit Kumar', token: 'T003', reason: 'Follow-up' }

/** Pending appointments count (receptionist) */
export const MOCK_PENDING_APPOINTMENTS = 14

/** Pending vitals (nurse) */
export const MOCK_PENDING_VITALS = [
  { id: 'V1', patientName: 'Raj Mehta', room: 'W1-02' },
  { id: 'V2', patientName: 'Priya Shah', room: 'W1-05' },
]

/** Recent bed status changes (nurse) */
export const MOCK_RECENT_BED_CHANGES = [
  { time: '10:45', ward: 'General', bed: '3', action: 'Freed' },
  { time: '10:30', ward: 'ICU', bed: '1', action: 'Occupied' },
  { time: '10:15', ward: 'General', bed: '7', action: 'Reserved' },
]
