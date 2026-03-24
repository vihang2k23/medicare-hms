import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type QueueTokenStatus = 'waiting' | 'in-progress' | 'done' | 'skipped'

export interface QueueToken {
  tokenNumber: string
  patientName: string
  status: QueueTokenStatus
  department?: string
}

export interface QueueState {
  tokens: QueueToken[]
  currentToken: string | null
  simulationRunning: boolean
  servedToday: number
}

function nextTokenNumber(tokens: QueueToken[]): string {
  let max = 0
  for (const t of tokens) {
    const m = /^T(\d+)$/i.exec(t.tokenNumber.trim())
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `T${String(max + 1).padStart(3, '0')}`
}

const initialState: QueueState = {
  tokens: [],
  currentToken: null,
  simulationRunning: false,
  servedToday: 0,
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
    issueToken(state, action: PayloadAction<{ patientName: string; department?: string }>) {
      const name = action.payload.patientName.trim()
      if (!name) return
      const tokenNumber = nextTokenNumber(state.tokens)
      state.tokens.push({
        tokenNumber,
        patientName: name,
        status: 'waiting',
        department: action.payload.department?.trim() || undefined,
      })
    },
    callNext(state) {
      const inProg = state.tokens.find((t) => t.status === 'in-progress')
      if (inProg) {
        inProg.status = 'done'
        state.servedToday += 1
      }
      const waiting = state.tokens.find((t) => t.status === 'waiting')
      if (waiting) {
        waiting.status = 'in-progress'
        state.currentToken = waiting.tokenNumber
      } else {
        state.currentToken = null
      }
    },
    completeCurrent(state) {
      if (!state.currentToken) return
      const t = state.tokens.find((x) => x.tokenNumber === state.currentToken)
      if (t && t.status === 'in-progress') {
        t.status = 'done'
        state.servedToday += 1
      }
      state.currentToken = null
    },
    skipCurrent(state) {
      if (!state.currentToken) return
      const t = state.tokens.find((x) => x.tokenNumber === state.currentToken)
      if (t && t.status === 'in-progress') {
        t.status = 'skipped'
      }
      state.currentToken = null
      const waiting = state.tokens.find((w) => w.status === 'waiting')
      if (waiting) {
        waiting.status = 'in-progress'
        state.currentToken = waiting.tokenNumber
      }
    },
    updateTokenStatus(
      state,
      action: PayloadAction<{ tokenNumber: string; status: QueueTokenStatus }>,
    ) {
      const t = state.tokens.find((x) => x.tokenNumber === action.payload.tokenNumber)
      if (!t) return
      const prev = t.status
      const next = action.payload.status
      if (prev === next) return
      t.status = next
      if (prev === 'in-progress' && next === 'done') state.servedToday += 1
      if (state.currentToken === action.payload.tokenNumber && next !== 'in-progress') {
        state.currentToken = null
      }
    },
    markTokenInProgress(state, action: PayloadAction<string>) {
      const tokenNumber = action.payload
      const active = state.tokens.find((x) => x.status === 'in-progress')
      if (active && active.tokenNumber !== tokenNumber) {
        active.status = 'waiting'
      }
      const t = state.tokens.find((x) => x.tokenNumber === tokenNumber)
      if (!t) return
      if (t.status === 'done') return
      t.status = 'in-progress'
      state.currentToken = tokenNumber
    },
    addToken(state, action: PayloadAction<QueueToken>) {
      state.tokens.push(action.payload)
    },
    resetQueue(state) {
      state.tokens = []
      state.currentToken = null
      state.servedToday = 0
    },
  },
})

export const {
  setTokens,
  setCurrentToken,
  setSimulationStatus,
  issueToken,
  callNext,
  completeCurrent,
  skipCurrent,
  updateTokenStatus,
  markTokenInProgress,
  addToken,
  resetQueue,
} = queueSlice.actions

export { nextTokenNumber }
export default queueSlice.reducer
