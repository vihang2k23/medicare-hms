import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { OPD_DEPARTMENTS } from '../../config/departments'
import type { ScheduleDoctor } from '../appointments/types'
import { pickDoctorForDepartment } from './opdQueueDoctors'
import type { OpdQueueToken, OpdTokenStatus } from './opdQueueTypes'

export type { OpdQueueToken, OpdTokenStatus } from './opdQueueTypes'

export interface QueueState {
  queue: OpdQueueToken[]
  currentToken: number | null
  simulationRunning: boolean
  servedToday: number
  nextTokenId: number
}

const initialState: QueueState = {
  queue: [],
  currentToken: null,
  simulationRunning: false,
  servedToday: 0,
  nextTokenId: 1,
}

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    issueToken(
      state,
      action: PayloadAction<{ patientName: string; department?: string; scheduleDoctors?: ScheduleDoctor[] }>,
    ) {
      const name = action.payload.patientName.trim()
      if (!name) return
      const deptRaw = action.payload.department?.trim()
      const dept =
        deptRaw && OPD_DEPARTMENTS.includes(deptRaw as (typeof OPD_DEPARTMENTS)[number])
          ? deptRaw
          : OPD_DEPARTMENTS[0]
      const { doctorId, doctorName } = pickDoctorForDepartment(dept, action.payload.scheduleDoctors)
      const tokenId = state.nextTokenId
      state.queue.push({
        tokenId,
        patientName: name,
        department: dept,
        doctorId,
        doctorName,
        issuedAt: Date.now(),
        status: 'waiting',
      })
      state.nextTokenId = tokenId + 1
    },
    callNext(state) {
      const tokens = [...state.queue]
      const inProgIdx = tokens.findIndex((t) => t.status === 'in-progress')
      if (inProgIdx !== -1) {
        tokens[inProgIdx] = { ...tokens[inProgIdx], status: 'done' }
      }
      const waitIdx = tokens.findIndex((t) => t.status === 'waiting')
      let currentToken: number | null = null
      if (waitIdx !== -1) {
        tokens[waitIdx] = { ...tokens[waitIdx], status: 'in-progress' }
        currentToken = tokens[waitIdx].tokenId
      }
      const servedDelta = inProgIdx !== -1 ? 1 : 0
      state.queue = tokens
      state.currentToken = currentToken
      state.servedToday += servedDelta
    },
    completeCurrent(state) {
      if (state.currentToken == null) return
      let inc = 0
      state.queue = state.queue.map((t) => {
        if (t.tokenId !== state.currentToken) return t
        if (t.status !== 'in-progress') return t
        inc = 1
        return { ...t, status: 'done' as const }
      })
      state.currentToken = null
      state.servedToday += inc
    },
    skipCurrent(state) {
      if (state.currentToken == null) return
      const idx = state.queue.findIndex((x) => x.tokenId === state.currentToken)
      if (idx === -1) return
      const cur = state.queue[idx]
      if (cur.status !== 'in-progress') return
      const skippedId = cur.tokenId
      const without = state.queue.filter((_, i) => i !== idx)
      const requeued: OpdQueueToken = { ...cur, status: 'waiting' }
      const tokens = [...without, requeued]
      const waitings = tokens.filter((t) => t.status === 'waiting')
      if (waitings.length === 0) {
        state.queue = tokens
        state.currentToken = null
        return
      }
      if (waitings.length === 1 && waitings[0].tokenId === skippedId) {
        state.queue = tokens
        state.currentToken = null
        return
      }
      const firstWaitIdx = tokens.findIndex((t) => t.status === 'waiting')
      const nextTok = tokens[firstWaitIdx]
      state.queue = tokens.map((t, i) =>
        i === firstWaitIdx ? { ...t, status: 'in-progress' as const } : t,
      )
      state.currentToken = nextTok.tokenId
    },
    resetQueue(state) {
      state.queue = []
      state.currentToken = null
      state.servedToday = 0
      state.simulationRunning = false
      state.nextTokenId = 1
    },
    setSimulationRunning(state, action: PayloadAction<boolean>) {
      state.simulationRunning = action.payload
    },
    updateTokenStatus(state, action: PayloadAction<{ tokenId: number; status: OpdTokenStatus }>) {
      const { tokenId, status } = action.payload
      let servedDelta = 0
      state.queue = state.queue.map((t) => {
        if (t.tokenId !== tokenId) return t
        const prev = t.status
        if (prev === status) return t
        if (prev === 'in-progress' && status === 'done') servedDelta += 1
        return { ...t, status }
      })
      if (state.currentToken === tokenId && status !== 'in-progress') {
        state.currentToken = null
      }
      state.servedToday += servedDelta
    },
    markTokenInProgress(state, action: PayloadAction<number>) {
      const tokenId = action.payload
      state.queue = state.queue.map((t) => {
        if (t.status === 'in-progress' && t.tokenId !== tokenId) {
          return { ...t, status: 'waiting' as const }
        }
        if (t.tokenId === tokenId) {
          if (t.status === 'done') return t
          return { ...t, status: 'in-progress' as const }
        }
        return t
      })
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

export default queueSlice.reducer

/** Display label for numeric token id (e.g. `#001`). */
export function formatOpdTokenLabel(tokenId: number) {
  return `#${String(tokenId).padStart(3, '0')}`
}
