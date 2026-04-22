import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { WARDS } from '../../config/wards'

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

export interface WardDefinition {
  id: string
  name: string
}

export interface Bed {
  id: string
  wardId: string
  wardName: string
  bedNumber: string
  status: BedStatus
  patientId?: string
  /** Display label when not linked to registry (e.g. walk-in). */
  occupantName?: string
}

export interface BedFeedEntry {
  id: string
  time: number
  message: string
}

export interface BedState {
  wards: WardDefinition[]
  beds: Bed[]
  /** Ward id -> count of beds by status */
  wardSummary: Record<string, { available: number; occupied: number; reserved: number; maintenance: number }>
  /** When true, periodic simulation updates random beds (navbar toggle). */
  bedSimulationRunning: boolean
  /** Recent bed events (manual + simulation), newest first. */
  bedFeed: BedFeedEntry[]
}

const MAX_BED_FEED = 20

function pushBedFeed(state: BedState, message: string) {
  state.bedFeed.unshift({
    id: `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    message,
  })
  if (state.bedFeed.length > MAX_BED_FEED) {
    state.bedFeed.length = MAX_BED_FEED
  }
}

function computeWardSummary(wards: WardDefinition[], beds: Bed[]): BedState['wardSummary'] {
  const wardSummary: BedState['wardSummary'] = {}
  for (const w of wards) {
    wardSummary[w.id] = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
  }
  for (const bed of beds) {
    if (!wardSummary[bed.wardId]) {
      wardSummary[bed.wardId] = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    }
    wardSummary[bed.wardId][bed.status]++
  }
  return wardSummary
}

function nextWardId(wards: WardDefinition[], beds: Bed[]): string {
  let max = 0
  const scan = (id: string) => {
    const m = /^W(\d+)$/.exec(id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  for (const w of wards) scan(w.id)
  for (const b of beds) scan(b.wardId)
  return `W${max + 1}`
}

function newBedId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `bed-${crypto.randomUUID()}`
  }
  return `bed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Next numeric bed label within a ward (avoids colliding after transfers). */
function nextBedNumberInWard(wardId: string, beds: Bed[], excludeBedId?: string): string {
  let max = 0
  for (const b of beds) {
    if (excludeBedId && b.id === excludeBedId) continue
    if (b.wardId !== wardId) continue
    const n = parseInt(b.bedNumber, 10)
    if (!Number.isNaN(n)) max = Math.max(max, n)
  }
  return String(max + 1)
}

const initialWards: WardDefinition[] = WARDS.map((w) => ({ id: w.id, name: w.name }))

const [wardGeneral, wardIcu, wardPed] = WARDS

const initialBeds: Bed[] = [
  {
    id: 'b1',
    wardId: wardGeneral.id,
    wardName: wardGeneral.name,
    bedNumber: '1',
    status: 'occupied',
    patientId: 'P-1042',
    occupantName: 'A. Menon',
  },
  { id: 'b2', wardId: wardGeneral.id, wardName: wardGeneral.name, bedNumber: '2', status: 'available' },
  { id: 'b3', wardId: wardGeneral.id, wardName: wardGeneral.name, bedNumber: '3', status: 'occupied', occupantName: 'B. Smith' },
  { id: 'b6', wardId: wardGeneral.id, wardName: wardGeneral.name, bedNumber: '4', status: 'maintenance' },
  { id: 'b4', wardId: wardIcu.id, wardName: wardIcu.name, bedNumber: '1', status: 'occupied', occupantName: 'R. Khan' },
  { id: 'b5', wardId: wardIcu.id, wardName: wardIcu.name, bedNumber: '2', status: 'available' },
  { id: 'b7', wardId: wardPed.id, wardName: wardPed.name, bedNumber: '1', status: 'available' },
  { id: 'b8', wardId: wardPed.id, wardName: wardPed.name, bedNumber: '2', status: 'occupied', occupantName: 'S. Lee' },
]

const initialState: BedState = {
  wards: initialWards,
  beds: initialBeds,
  wardSummary: computeWardSummary(initialWards, initialBeds),
  bedSimulationRunning: false,
  bedFeed: [],
}

const bedSlice = createSlice({
  name: 'beds',
  initialState,
  reducers: {
    setBeds(state, action: PayloadAction<Bed[]>) {
      state.beds = action.payload
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    setWards(state, action: PayloadAction<WardDefinition[]>) {
      state.wards = action.payload
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    addWard(state, action: PayloadAction<{ name: string }>) {
      const name = action.payload.name.trim()
      if (!name) return
      const id = nextWardId(state.wards, state.beds)
      state.wards.push({ id, name })
      state.beds.push({
        id: newBedId(),
        wardId: id,
        wardName: name,
        bedNumber: '1',
        status: 'available',
      })
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    updateWard(state, action: PayloadAction<{ wardId: string; name: string }>) {
      const name = action.payload.name.trim()
      if (!name) return
      const w = state.wards.find((x) => x.id === action.payload.wardId)
      if (!w) return
      w.name = name
      for (const bed of state.beds) {
        if (bed.wardId === action.payload.wardId) bed.wardName = name
      }
    },
    removeWard(state, action: PayloadAction<{ wardId: string }>) {
      const { wardId } = action.payload
      state.wards = state.wards.filter((w) => w.id !== wardId)
      state.beds = state.beds.filter((b) => b.wardId !== wardId)
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    updateBedStatus(state, action: PayloadAction<{ bedId: string; status: BedStatus }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed) return
      const next = action.payload.status
      if (bed.status === next) return
      const prev = bed.status
      bed.status = next
      if (next !== 'occupied') {
        delete bed.patientId
        delete bed.occupantName
      }
      pushBedFeed(state, `${bed.wardName} · Bed ${bed.bedNumber}: ${prev} → ${next}`)
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    assignPatientToBed(
      state,
      action: PayloadAction<{ bedId: string; occupantName: string; patientId?: string }>,
    ) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed) return
      if (bed.status !== 'available' && bed.status !== 'reserved') return
      const name = action.payload.occupantName.trim()
      if (!name) return
      bed.status = 'occupied'
      bed.occupantName = name
      const pid = action.payload.patientId?.trim()
      bed.patientId = pid || undefined
      pushBedFeed(state, `${bed.wardName} · Bed ${bed.bedNumber}: assigned ${name}`)
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    dischargePatientFromBed(state, action: PayloadAction<{ bedId: string }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed || bed.status !== 'occupied') return
      bed.status = 'available'
      delete bed.patientId
      delete bed.occupantName
      pushBedFeed(state, `${bed.wardName} · Bed ${bed.bedNumber}: discharged`)
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    addBedToWard(state, action: PayloadAction<{ wardId: string }>) {
      const ward = state.wards.find((w) => w.id === action.payload.wardId)
      if (!ward) return
      const bedNumber = nextBedNumberInWard(action.payload.wardId, state.beds)
      state.beds.push({
        id: newBedId(),
        wardId: ward.id,
        wardName: ward.name,
        bedNumber,
        status: 'available',
      })
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    /** Move an available bed to another ward; assigns next free bed number in the target ward. */
    transferBedToWard(state, action: PayloadAction<{ bedId: string; targetWardId: string }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed || bed.status !== 'available') return
      const target = state.wards.find((w) => w.id === action.payload.targetWardId)
      if (!target || target.id === bed.wardId) return
      const bedNumber = nextBedNumberInWard(target.id, state.beds, bed.id)
      bed.wardId = target.id
      bed.wardName = target.name
      bed.bedNumber = bedNumber
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    /** Remove an empty (available) bed from the grid. */
    removeBed(state, action: PayloadAction<{ bedId: string }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed || bed.status !== 'available') return
      state.beds = state.beds.filter((b) => b.id !== action.payload.bedId)
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
    setBedSimulationRunning(state, action: PayloadAction<boolean>) {
      state.bedSimulationRunning = action.payload
    },
    runBedSimulationTick(state) {
      if (!state.bedSimulationRunning || state.beds.length === 0) return
      const statuses: BedStatus[] = ['available', 'occupied', 'reserved', 'maintenance']
      const pickCount = Math.random() < 0.5 ? 1 : 2
      const n = Math.min(pickCount, state.beds.length)
      const used = new Set<number>()
      while (used.size < n) {
        used.add(Math.floor(Math.random() * state.beds.length))
      }
      for (const i of used) {
        const bed = state.beds[i]!
        const next = statuses[Math.floor(Math.random() * statuses.length)]!
        if (bed.status === next) continue
        const prev = bed.status
        bed.status = next
        if (next !== 'occupied') {
          delete bed.patientId
          delete bed.occupantName
        } else if (!bed.occupantName?.trim()) {
          bed.occupantName = 'Simulated occupant'
        }
        pushBedFeed(state, `${bed.wardName} · Bed ${bed.bedNumber}: ${prev} → ${next} (sim)`)
      }
      state.wardSummary = computeWardSummary(state.wards, state.beds)
    },
  },
})

export const {
  setBeds,
  setWards,
  addWard,
  updateWard,
  removeWard,
  updateBedStatus,
  assignPatientToBed,
  dischargePatientFromBed,
  addBedToWard,
  transferBedToWard,
  removeBed,
  setBedSimulationRunning,
  runBedSimulationTick,
} = bedSlice.actions
export default bedSlice.reducer
