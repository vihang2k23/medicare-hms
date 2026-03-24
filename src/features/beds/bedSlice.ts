import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { WARDS } from '../../config/wards'

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

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

export interface BedState {
  beds: Bed[]
  /** Ward id -> count of beds by status */
  wardSummary: Record<string, { available: number; occupied: number; reserved: number; maintenance: number }>
}

function summarizeBeds(beds: Bed[]): BedState['wardSummary'] {
  const wardSummary: BedState['wardSummary'] = {}
  for (const bed of beds) {
    if (!wardSummary[bed.wardId]) {
      wardSummary[bed.wardId] = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    }
    wardSummary[bed.wardId][bed.status]++
  }
  return wardSummary
}

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
  { id: 'b3', wardId: wardGeneral.id, wardName: wardGeneral.name, bedNumber: '3', status: 'reserved' },
  { id: 'b6', wardId: wardGeneral.id, wardName: wardGeneral.name, bedNumber: '4', status: 'maintenance' },
  { id: 'b4', wardId: wardIcu.id, wardName: wardIcu.name, bedNumber: '1', status: 'occupied', occupantName: 'R. Khan' },
  { id: 'b5', wardId: wardIcu.id, wardName: wardIcu.name, bedNumber: '2', status: 'available' },
  { id: 'b7', wardId: wardPed.id, wardName: wardPed.name, bedNumber: '1', status: 'available' },
  { id: 'b8', wardId: wardPed.id, wardName: wardPed.name, bedNumber: '2', status: 'occupied', occupantName: 'S. Lee' },
]

const initialState: BedState = {
  beds: initialBeds,
  wardSummary: summarizeBeds(initialBeds),
}

const bedSlice = createSlice({
  name: 'beds',
  initialState,
  reducers: {
    setBeds(state, action: PayloadAction<Bed[]>) {
      state.beds = action.payload
      state.wardSummary = {}
      action.payload.forEach((bed) => {
        if (!state.wardSummary[bed.wardId]) {
          state.wardSummary[bed.wardId] = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
        }
        state.wardSummary[bed.wardId][bed.status]++
      })
    },
    updateBedStatus(state, action: PayloadAction<{ bedId: string; status: BedStatus }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed) return
      const prev = bed.status
      const next = action.payload.status
      if (prev === next) return
      bed.status = next
      if (next !== 'occupied') {
        delete bed.patientId
        delete bed.occupantName
      }
      const w = state.wardSummary[bed.wardId]
      if (w) {
        w[prev] = Math.max(0, w[prev] - 1)
        w[next] = (w[next] ?? 0) + 1
      }
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
      const prev = bed.status
      const w = state.wardSummary[bed.wardId]
      if (!w) return
      w[prev] = Math.max(0, w[prev] - 1)
      w.occupied += 1
      bed.status = 'occupied'
      bed.occupantName = name
      const pid = action.payload.patientId?.trim()
      bed.patientId = pid || undefined
    },
    dischargePatientFromBed(state, action: PayloadAction<{ bedId: string }>) {
      const bed = state.beds.find((b) => b.id === action.payload.bedId)
      if (!bed || bed.status !== 'occupied') return
      const w = state.wardSummary[bed.wardId]
      if (!w) return
      w.occupied = Math.max(0, w.occupied - 1)
      w.available += 1
      bed.status = 'available'
      delete bed.patientId
      delete bed.occupantName
    },
  },
})

export const { setBeds, updateBedStatus, assignPatientToBed, dischargePatientFromBed } = bedSlice.actions
export default bedSlice.reducer
