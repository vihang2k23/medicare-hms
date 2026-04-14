import { configureStore } from '@reduxjs/toolkit'
import queueReducer, {
  callNext,
  completeCurrent,
  formatOpdTokenLabel,
  issueToken,
  markTokenInProgress,
  resetQueue,
  setSimulationRunning,
  skipCurrent,
  updateTokenStatus,
} from '../queueSlice'

function makeStore() {
  return configureStore({
    reducer: { queue: queueReducer },
  })
}

describe('queueSlice', () => {
  it('does not issue a token for blank patient name', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: '   ' }))
    expect(store.getState().queue.queue).toHaveLength(0)
  })

  it('issues a token with incremented id and waiting status', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'Alice' }))
    store.dispatch(issueToken({ patientName: 'Bob' }))
    const { queue, nextTokenId, currentToken } = store.getState().queue
    expect(queue).toHaveLength(2)
    expect(queue[0].tokenId).toBe(1)
    expect(queue[0].patientName).toBe('Alice')
    expect(queue[0].status).toBe('waiting')
    expect(queue[1].tokenId).toBe(2)
    expect(nextTokenId).toBe(3)
    expect(currentToken).toBeNull()
  })

  it('callNext moves the first waiting token to in-progress', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(issueToken({ patientName: 'B' }))
    store.dispatch(callNext())
    const q = store.getState().queue
    expect(q.queue[0].status).toBe('in-progress')
    expect(q.queue[1].status).toBe('waiting')
    expect(q.currentToken).toBe(1)
    expect(q.servedToday).toBe(0)
  })

  it('callNext completes the in-progress token before advancing', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(issueToken({ patientName: 'B' }))
    store.dispatch(callNext())
    store.dispatch(callNext())
    const q = store.getState().queue
    expect(q.queue[0].status).toBe('done')
    expect(q.queue[1].status).toBe('in-progress')
    expect(q.currentToken).toBe(2)
    expect(q.servedToday).toBe(1)
  })

  it('completeCurrent marks the active token done and clears current', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(callNext())
    store.dispatch(completeCurrent())
    const q = store.getState().queue
    expect(q.queue[0].status).toBe('done')
    expect(q.currentToken).toBeNull()
    expect(q.servedToday).toBe(1)
  })

  it('resetQueue restores initial counters and empties the queue', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(callNext())
    store.dispatch(resetQueue())
    const q = store.getState().queue
    expect(q.queue).toHaveLength(0)
    expect(q.currentToken).toBeNull()
    expect(q.servedToday).toBe(0)
    expect(q.nextTokenId).toBe(1)
  })

  it('defaults invalid department to the first OPD department', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'X', department: 'Not a real dept' }))
    expect(store.getState().queue.queue[0]!.department).toBe('General OPD')
  })

  it('completeCurrent is a no-op when nothing is in progress', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(completeCurrent())
    expect(store.getState().queue.servedToday).toBe(0)
  })

  it('skipCurrent requeues alone in-progress token and clears current', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'Only' }))
    store.dispatch(callNext())
    store.dispatch(skipCurrent())
    const q = store.getState().queue
    expect(q.queue).toHaveLength(1)
    expect(q.queue[0]!.status).toBe('waiting')
    expect(q.currentToken).toBeNull()
  })

  it('skipCurrent moves the next waiting token to in-progress when others exist', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(issueToken({ patientName: 'B' }))
    store.dispatch(callNext())
    store.dispatch(skipCurrent())
    const q = store.getState().queue
    expect(q.queue.filter((t) => t.status === 'in-progress')).toHaveLength(1)
    expect(q.currentToken).toBe(2)
  })

  it('setSimulationRunning toggles the flag', () => {
    const store = makeStore()
    store.dispatch(setSimulationRunning(true))
    expect(store.getState().queue.simulationRunning).toBe(true)
    store.dispatch(setSimulationRunning(false))
    expect(store.getState().queue.simulationRunning).toBe(false)
  })

  it('updateTokenStatus counts done transitions from in-progress and clears current', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(markTokenInProgress(1))
    store.dispatch(updateTokenStatus({ tokenId: 1, status: 'done' }))
    const q = store.getState().queue
    expect(q.queue[0]!.status).toBe('done')
    expect(q.currentToken).toBeNull()
    expect(q.servedToday).toBe(1)
  })

  it('updateTokenStatus ignores setting the same status twice', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(updateTokenStatus({ tokenId: 1, status: 'waiting' }))
    store.dispatch(updateTokenStatus({ tokenId: 1, status: 'waiting' }))
    expect(store.getState().queue.servedToday).toBe(0)
  })

  it('markTokenInProgress demotes other in-progress tokens', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(issueToken({ patientName: 'B' }))
    store.dispatch(markTokenInProgress(1))
    store.dispatch(markTokenInProgress(2))
    const q = store.getState().queue
    expect(q.queue.find((t) => t.tokenId === 1)!.status).toBe('waiting')
    expect(q.queue.find((t) => t.tokenId === 2)!.status).toBe('in-progress')
    expect(q.currentToken).toBe(2)
  })

  it('markTokenInProgress does not revive a done token', () => {
    const store = makeStore()
    store.dispatch(issueToken({ patientName: 'A' }))
    store.dispatch(markTokenInProgress(1))
    store.dispatch(updateTokenStatus({ tokenId: 1, status: 'done' }))
    store.dispatch(markTokenInProgress(1))
    expect(store.getState().queue.queue[0]!.status).toBe('done')
  })
})

describe('formatOpdTokenLabel', () => {
  it('pads token ids for display', () => {
    expect(formatOpdTokenLabel(1)).toBe('#001')
    expect(formatOpdTokenLabel(42)).toBe('#042')
  })
})
