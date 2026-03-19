import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

export interface Bed {
  id: string
  wardId: string
  wardName: string
  bedNumber: string
  status: BedStatus
  patientId?: string
}

export interface BedState {
  beds: Bed[]
  /** Ward id -> count of beds by status */
  wardSummary: Record<string, { available: number; occupied: number; reserved: number; maintenance: number }>
}

const initialState: BedState = {
  beds: [
    { id: 'b1', wardId: 'W1', wardName: 'General', bedNumber: '1', status: 'occupied' },
    { id: 'b2', wardId: 'W1', wardName: 'General', bedNumber: '2', status: 'available' },
    { id: 'b3', wardId: 'W1', wardName: 'General', bedNumber: '3', status: 'reserved' },
    { id: 'b4', wardId: 'W2', wardName: 'ICU', bedNumber: '1', status: 'occupied' },
    { id: 'b5', wardId: 'W2', wardName: 'ICU', bedNumber: '2', status: 'available' },
  ],
  wardSummary: { W1: { available: 1, occupied: 1, reserved: 1, maintenance: 0 }, W2: { available: 1, occupied: 1, reserved: 0, maintenance: 0 } },
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
      bed.status = action.payload.status
      const w = state.wardSummary[bed.wardId]
      if (w) {
        w[prev] = Math.max(0, w[prev] - 1)
        w[action.payload.status] = (w[action.payload.status] ?? 0) + 1
      }
    },
  },
})

export const { setBeds, updateBedStatus } = bedSlice.actions
export default bedSlice.reducer
