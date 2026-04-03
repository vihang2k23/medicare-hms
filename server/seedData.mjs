/**
 * Idempotent JSON Server seed: adds MED-SEED-* patients + vit-gen-* vitals.
 * Run: npm run seed   (stop `npm run server` first so the file isn’t overwritten mid-write.)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'db.json')

const FIRST_NAMES = [
  'Priya',
  'Amit',
  'Sneha',
  'Rahul',
  'Kavita',
  'Vikram',
  'Ananya',
  'Arjun',
  'Meera',
  'Rohan',
  'Divya',
  'Karan',
  'Neha',
  'Suresh',
  'Pooja',
  'Manish',
  'Deepa',
  'Nikhil',
]
const LAST_NAMES = [
  'Sharma',
  'Verma',
  'Patel',
  'Singh',
  'Reddy',
  'Iyer',
  'Kapoor',
  'Nair',
  'Joshi',
  'Mehta',
  'Kulkarni',
  'Desai',
  'Menon',
  'Rao',
  'Agarwal',
  'Chopra',
  'Bose',
  'Malhotra',
]
const CITIES = [
  ['Mumbai', 'Maharashtra', '400001'],
  ['Delhi', 'Delhi', '110001'],
  ['Bengaluru', 'Karnataka', '560001'],
  ['Hyderabad', 'Telangana', '500001'],
  ['Chennai', 'Tamil Nadu', '600001'],
  ['Kolkata', 'West Bengal', '700001'],
  ['Pune', 'Maharashtra', '411001'],
  ['Ahmedabad', 'Gujarat', '380001'],
]
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

function pick(arr, i) {
  return arr[i % arr.length]
}

/** Target total demo patients (including your existing non-seed rows). */
const TARGET_EXTRA_SEED_PATIENTS = 17

function buildSeedPatients(count) {
  const now = Date.now()
  const out = []
  for (let i = 0; i < count; i++) {
    const fn = pick(FIRST_NAMES, i)
    const ln = pick(LAST_NAMES, (i * 3) % LAST_NAMES.length)
    const [city, state, pin] = pick(CITIES, i)
    const y = 1965 + (i % 45)
    const m = String((i % 12) + 1).padStart(2, '0')
    const d = String((i % 28) + 1).padStart(2, '0')
    const id = `MED-SEED-${String(i + 1).padStart(4, '0')}`
    out.push({
      id,
      fullName: `${fn} ${ln}`,
      dob: `${y}-${m}-${d}`,
      gender: i % 3 === 0 ? 'female' : i % 3 === 1 ? 'male' : 'other',
      bloodGroup: pick(BLOOD, i),
      phone: `9${String(800000000 + i).slice(0, 9)}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@demo.medicare.local`,
      address: `${100 + i} Sample Street, Block ${(i % 5) + 1}`,
      city,
      state,
      pin,
      photo: null,
      allergies: i % 7 === 0 ? 'Penicillin' : i % 11 === 0 ? 'Latex' : '',
      chronicConditions: i % 9 === 0 ? 'Type 2 diabetes' : i % 13 === 0 ? 'Hypertension' : '',
      pastSurgeries: i % 10 === 0 ? 'Appendectomy (2018)' : '',
      currentMedications: i % 8 === 0 ? 'Metformin 500mg' : '',
      emergencyName: `${pick(LAST_NAMES, i + 1)} ${fn}`,
      emergencyRelationship: i % 2 === 0 ? 'Spouse' : 'Parent',
      emergencyPhone: `9${String(810000000 + i).slice(0, 9)}`,
      createdAt: now - (i + 1) * 86_400_000,
      isActive: true,
    })
  }
  return out
}

function randomVital(i, patientId, recordedAt, nurse) {
  const base = 110 + (i % 25)
  return {
    id: `vit-gen-${patientId}-${i}-${recordedAt}`,
    patientId,
    recordedAt,
    systolic: base + (i % 15),
    diastolic: 70 + (i % 12),
    pulse: 62 + (i % 28),
    tempC: Math.round((36.2 + (i % 15) * 0.05) * 10) / 10,
    spo2: 95 + (i % 5),
    notes: i % 6 === 0 ? 'OPD triage' : i % 7 === 0 ? 'Ward round' : '',
    recordedBy: nurse,
  }
}

function buildVitalsForPatients(patientIds) {
  const nurses = ['Nurse Anita', 'Nurse Rohan', 'Nurse Kavita']
  const day = 86_400_000
  const now = Date.now()
  const out = []
  let k = 0
  for (const pid of patientIds) {
    const readings = 2 + (k % 3)
    for (let r = 0; r < readings; r++) {
      const at = now - (r + 1) * day - (k * 3_600_000) - r * 45_000
      out.push(randomVital(k + r * 17, pid, at, pick(nurses, k + r)))
      k++
    }
  }
  return out
}

function main() {
  const raw = fs.readFileSync(dbPath, 'utf8')
  const db = JSON.parse(raw)

  if (!Array.isArray(db.patients)) db.patients = []
  if (!Array.isArray(db.vitals)) db.vitals = []
  if (!Array.isArray(db.internalDoctors)) db.internalDoctors = []

  const beforePatients = db.patients.length
  const beforeVitals = db.vitals.length

  db.patients = db.patients.filter((p) => !String(p.id).startsWith('MED-SEED-'))
  db.vitals = db.vitals.filter((v) => !String(v.id).startsWith('vit-gen-'))

  const seedPatients = buildSeedPatients(TARGET_EXTRA_SEED_PATIENTS)
  db.patients.push(...seedPatients)

  const allPatientIds = db.patients.map((p) => p.id)
  const extraVitals = buildVitalsForPatients(allPatientIds)
  db.vitals.push(...extraVitals)

  fs.writeFileSync(dbPath, JSON.stringify(db))
  console.log(
    `Seed complete: +${seedPatients.length} patients (MED-SEED-*), +${extraVitals.length} vitals (vit-gen-*).`,
  )
  console.log(`Totals: patients ${beforePatients} → ${db.patients.length}, vitals ${beforeVitals} → ${db.vitals.length}`)
}

main()
