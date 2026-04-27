import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { store, type AppDispatch, type RootState } from '../../store'
import { notify } from '../../utils/helpers'
import { callNext, setSimulationRunning } from '../../store/slices/queueSlice'
import { canCallNext, shouldStopQueueSimulation } from './queueSimulation'
import type { OpdQueueToken } from './opdQueueTypes'

/** Dispatches call next on an interval while simulation is enabled. */
export function useQueueAutoAdvance(intervalMs: number) {
  const dispatch = useDispatch<AppDispatch>()
  const running = useSelector((s: RootState) => s.queue.simulationRunning)
  const queue = useSelector((s: RootState) => s.queue.queue) as unknown as OpdQueueToken[]
  const stopNotifiedRef = useRef(false)

  useEffect(() => {
    if (!running || intervalMs < 1000) return
    const id = window.setInterval(() => {
      const q = store.getState().queue.queue
      if (!canCallNext(q as unknown as OpdQueueToken[])) return
      dispatch(callNext())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs, dispatch])

  useEffect(() => {
    if (!running) {
      stopNotifiedRef.current = false
      return
    }
    if (!shouldStopQueueSimulation(queue as unknown as OpdQueueToken[])) return
    dispatch(setSimulationRunning(false))
    if (!stopNotifiedRef.current) {
      stopNotifiedRef.current = true
      notify.success('No more patients waiting in queue. Simulation stopped.')
    }
  }, [queue, running, dispatch])
}
