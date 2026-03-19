import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface QueueToken {
  tokenNumber: string
  patientName: string
  status: 'waiting' | 'in-progress' | 'done'
}

export interface QueueState {
  tokens: QueueToken[]
  currentToken: string | null
  simulationRunning: boolean
}

const initialState: QueueState = {
  tokens: [
    { tokenNumber: 'T001', patientName: 'Patient A', status: 'in-progress' },
    { tokenNumber: 'T002', patientName: 'Patient B', status: 'waiting' },
    { tokenNumber: 'T003', patientName: 'Patient C', status: 'waiting' },
  ],
  currentToken: 'T001',
  simulationRunning: false,
}

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<QueueToken[]>) {
      state.tokens = action.payload
    },
    setCurrentToken(state, action: PayloadAction<string | null>) {
      state.currentToken = action.payload
    },
    setSimulationStatus(state, action: PayloadAction<boolean>) {
      state.simulationRunning = action.payload
    },
    addToken(state, action: PayloadAction<QueueToken>) {
      state.tokens.push(action.payload)
    },
    updateTokenStatus(state, action: PayloadAction<{ tokenNumber: string; status: QueueToken['status'] }>) {
      const t = state.tokens.find((x) => x.tokenNumber === action.payload.tokenNumber)
      if (t) t.status = action.payload.status
    },
  },
})

export const { setTokens, setCurrentToken, setSimulationStatus, addToken, updateTokenStatus } = queueSlice.actions
export default queueSlice.reducer
