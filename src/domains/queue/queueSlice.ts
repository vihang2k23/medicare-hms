import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type TokenStatus = 'waiting' | 'in-progress' | 'done'

export interface QueueToken {
  tokenId: number
  patientName: string
  department: string
  status: TokenStatus
  createdAt: number
}

export interface QueueState {
  queue: QueueToken[]
  currentToken: number | null
  nextTokenId: number
  servedToday: number
  simulationRunning: boolean
}

const initialState: QueueState = {
  queue: [],
  currentToken: null,
  nextTokenId: 1,
  servedToday: 0,
  simulationRunning: false,
}

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    issueToken: (state, action: PayloadAction<{ patientName: string; department?: string }>) => {
      const { patientName, department = 'General OPD' } = action.payload
      
      // Don't issue tokens for blank patient names
      if (!patientName || !patientName.trim()) {
        return
      }

      const newToken: QueueToken = {
        tokenId: state.nextTokenId,
        patientName: patientName.trim(),
        department,
        status: 'waiting',
        createdAt: Date.now(),
      }

      state.queue.push(newToken)
      state.nextTokenId += 1
    },

    callNext: (state) => {
      // Complete any current in-progress token first
      if (state.currentToken !== null) {
        const currentToken = state.queue.find(t => t.tokenId === state.currentToken)
        if (currentToken && currentToken.status === 'in-progress') {
          currentToken.status = 'done'
          state.servedToday += 1
        }
      }

      // Find the first waiting token
      const waitingToken = state.queue.find(t => t.status === 'waiting')
      if (waitingToken) {
        waitingToken.status = 'in-progress'
        state.currentToken = waitingToken.tokenId
      } else {
        state.currentToken = null
      }
    },

    completeCurrent: (state) => {
      if (state.currentToken !== null) {
        const currentToken = state.queue.find(t => t.tokenId === state.currentToken)
        if (currentToken && currentToken.status === 'in-progress') {
          currentToken.status = 'done'
          state.servedToday += 1
          state.currentToken = null
        }
      }
    },

    skipCurrent: (state) => {
      if (state.currentToken !== null) {
        const currentToken = state.queue.find(t => t.tokenId === state.currentToken)
        if (currentToken && currentToken.status === 'in-progress') {
          currentToken.status = 'waiting'
          state.currentToken = null
          
          // Move to next waiting token if available
          const waitingToken = state.queue.find(t => t.status === 'waiting')
          if (waitingToken) {
            waitingToken.status = 'in-progress'
            state.currentToken = waitingToken.tokenId
          }
        }
      }
    },

    resetQueue: (state) => {
      state.queue = []
      state.currentToken = null
      state.nextTokenId = 1
      state.servedToday = 0
    },

    setSimulationRunning: (state, action: PayloadAction<boolean>) => {
      state.simulationRunning = action.payload
    },

    updateTokenStatus: (state, action: PayloadAction<{ tokenId: number; status: TokenStatus }>) => {
      const { tokenId, status } = action.payload
      const token = state.queue.find(t => t.tokenId === tokenId)
      
      if (!token) return

      // Count done transitions from in-progress
      if (token.status === 'in-progress' && status === 'done') {
        state.servedToday += 1
        if (state.currentToken === tokenId) {
          state.currentToken = null
        }
      }

      token.status = status
    },

    markTokenInProgress: (state, action: PayloadAction<number>) => {
      const tokenId = action.payload
      const token = state.queue.find(t => t.tokenId === tokenId)
      
      if (!token || token.status === 'done') return

      // Demote other in-progress tokens to waiting
      state.queue.forEach(t => {
        if (t.status === 'in-progress') {
          t.status = 'waiting'
        }
      })

      token.status = 'in-progress'
      state.currentToken = tokenId
    },
  },
})

export const {
  issueToken,
  callNext,
  completeCurrent,
  skipCurrent,
  resetQueue,
  setSimulationRunning,
  updateTokenStatus,
  markTokenInProgress,
} = queueSlice.actions

export const formatOpdTokenLabel = (tokenId: number): string => {
  return `#${tokenId.toString().padStart(3, '0')}`
}

export default queueSlice.reducer
