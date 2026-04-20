import { format, subDays } from 'date-fns'
import type { Appointment, AppointmentStatus } from '../appointments/types'
import type { Prescription } from '../prescriptions/types'
import { OPD_DEPARTMENTS } from '../../config/departments'
import type { OpdQueueToken } from '../queue/opdQueueTypes'
import type { QueueState } from '../queue/queueSlice'

const DEPT_DOCTOR: Record<string, { doctorId: string; doctorName: string }> = {
  'General OPD': { doctorId: 'D1', doctorName: 'Dr. Sharma' },
  Pediatrics: { doctorId: 'D2', doctorName: 'Dr. Patel' },
  Orthopedics: { doctorId: 'D3', doctorName: 'Dr. Kumar' },
  Cardiology: { doctorId: 'D4', doctorName: 'Dr. Nair' },
  Dermatology: { doctorId: 'D5', doctorName: 'Dr. Reddy' },
  Other: { doctorId: 'D1', doctorName: 'Dr. Sharma' },
}

const STATUS_ROTATION: AppointmentStatus[] = [
  'completed',
  'completed',
  'completed',
  'completed',
  'cancelled',
  'no-show',
  'scheduled',
  'confirmed',
  'in-progress',
]

/** Rich appointment set for admin reports (30-day spread, all departments, mixed outcomes). */
export function buildDemoReportsAppointments(): Appointment[] {
  const base = Date.now()
  const list: Appointment[] = []
  let k = 0
  for (let d = 0; d < 30; d++) {
    const dateStr = format(subDays(new Date(), d), 'yyyy-MM-dd')
    const perDay = 3 + (d % 5) + (d % 6 === 0 ? 2 : 0)
    for (let i = 0; i < perDay; i++) {
      const dept = OPD_DEPARTMENTS[(d + i + k) % OPD_DEPARTMENTS.length]
      const doc = DEPT_DOCTOR[dept] ?? DEPT_DOCTOR['General OPD']
      const patientNum = (k % 42) + 1
      const pid = `DEMO-P-${String(patientNum).padStart(3, '0')}`
      const h = 9 + (i % 6)
      const startM = i % 2 === 0 ? '00' : '30'
      const endH = startM === '00' ? h : h
      const endM = startM === '00' ? '30' : '00'
      list.push({
        id: `demo-rpt-apt-${k}`,
        patientId: pid,
        patientName: `Demo Patient ${patientNum}`,
        doctorId: doc.doctorId,
        doctorName: doc.doctorName,
        department: dept,
        date: dateStr,
        slotStart: `${String(h).padStart(2, '0')}:${startM}`,
        slotEnd: `${String(endH).padStart(2, '0')}:${endM}`,
        status: STATUS_ROTATION[k % STATUS_ROTATION.length],
        reason: 'Demo visit',
        createdAt: base - d * 86_400_000 - k * 1000,
      })
      k += 1
    }
  }
  return list
}

const DEMO_QUEUE_TOKENS: OpdQueueToken[] = [
  {
    tokenId: 1,
    patientName: 'Ananya Iyer',
    department: 'Cardiology',
    doctorId: 'D4',
    doctorName: 'Dr. Nair',
    issuedAt: Date.now() - 3_600_000,
    status: 'done',
  },
  {
    tokenId: 2,
    patientName: 'Rohit Mehta',
    department: 'General OPD',
    doctorId: 'D1',
    doctorName: 'Dr. Sharma',
    issuedAt: Date.now() - 2_400_000,
    status: 'in-progress',
  },
  {
    tokenId: 3,
    patientName: 'Sneha Kulkarni',
    department: 'Pediatrics',
    doctorId: 'D2',
    doctorName: 'Dr. Patel',
    issuedAt: Date.now() - 1_800_000,
    status: 'waiting',
  },
  {
    tokenId: 4,
    patientName: 'Vikram Desai',
    department: 'Orthopedics',
    doctorId: 'D3',
    doctorName: 'Dr. Kumar',
    issuedAt: Date.now() - 900_000,
    status: 'waiting',
  },
  {
    tokenId: 5,
    patientName: 'Priya Nambiar',
    department: 'Dermatology',
    doctorId: 'D5',
    doctorName: 'Dr. Reddy',
    issuedAt: Date.now() - 600_000,
    status: 'skipped',
  },
  {
    tokenId: 6,
    patientName: 'Arjun Bose',
    department: 'General OPD',
    doctorId: 'D1',
    doctorName: 'Dr. Sharma',
    issuedAt: Date.now() - 300_000,
    status: 'waiting',
  },
]

/** Preloaded queue slice so OPD charts show data on fresh sessions. */
export function buildDemoReportsQueueState(): QueueState {
  return {
    queue: DEMO_QUEUE_TOKENS,
    currentToken: 2,
    simulationRunning: false,
    servedToday: 14,
    nextTokenId: 7,
  }
}

export function buildDemoReportsPrescriptions(): Prescription[] {
  const t = Date.now()
  return [
    {
      id: 'demo-rpt-rx-1',
      patientId: 'DEMO-P-001',
      patientName: 'Demo Patient 1',
      doctorId: 'D1',
      doctorName: 'Dr. Sharma',
      diagnosis: 'Hypertension (demo)',
      medicines: [
        {
          id: 'm1',
          drugName: 'Amlodipine',
          dosage: '5 mg',
          frequency: 'Once daily',
        },
      ],
      status: 'active',
      createdAt: t - 86400000,
    },
    {
      id: 'demo-rpt-rx-2',
      patientId: 'DEMO-P-012',
      patientName: 'Demo Patient 12',
      doctorId: 'D4',
      doctorName: 'Dr. Nair',
      diagnosis: 'Follow-up (demo)',
      medicines: [
        { id: 'm2', drugName: 'Atorvastatin', dosage: '20 mg', frequency: 'At night' },
        { id: 'm3', drugName: 'Aspirin', dosage: '75 mg', frequency: 'Once daily' },
      ],
      status: 'completed',
      createdAt: t - 172800000,
    },
  ]
}
