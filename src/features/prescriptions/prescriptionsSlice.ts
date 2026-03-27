import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Prescription, PrescriptionMedicineLine, PrescriptionStatus } from './types'

export interface PrescriptionsState {
  prescriptions: Prescription[]
}

const initialState: PrescriptionsState = {
  prescriptions: [],
}

function newMedicineLine(): PrescriptionMedicineLine {
  return {
    id: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    drugName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  }
}

const prescriptionsSlice = createSlice({
  name: 'prescriptions',
  initialState,
  reducers: {
    hydratePrescriptions(state, action: PayloadAction<Prescription[]>) {
      state.prescriptions = action.payload
    },
    addPrescription(
      state,
      action: PayloadAction<{
        patientId: string
        patientName: string
        doctorId: string
        doctorName: string
        diagnosis?: string
        notes?: string
        medicines: PrescriptionMedicineLine[]
        status?: PrescriptionStatus
      }>,
    ) {
      const p = action.payload
      const id = `rx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      state.prescriptions.unshift({
        id,
        patientId: p.patientId,
        patientName: p.patientName,
        doctorId: p.doctorId,
        doctorName: p.doctorName,
        diagnosis: p.diagnosis,
        notes: p.notes,
        medicines: p.medicines,
        status: p.status ?? 'active',
        createdAt: Date.now(),
      })
    },
    updatePrescriptionStatus(state, action: PayloadAction<{ id: string; status: PrescriptionStatus }>) {
      const rx = state.prescriptions.find((r) => r.id === action.payload.id)
      if (rx) rx.status = action.payload.status
    },
    removePrescription(state, action: PayloadAction<string>) {
      state.prescriptions = state.prescriptions.filter((r) => r.id !== action.payload)
    },
  },
})

export const { hydratePrescriptions, addPrescription, updatePrescriptionStatus, removePrescription } =
  prescriptionsSlice.actions

export { newMedicineLine }
export default prescriptionsSlice.reducer
