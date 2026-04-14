import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { store, type AppDispatch, type RootState } from '../../app/store'
import { notify } from '../../shared/lib/notify'
import { callNext, setSimulationRunning } from './queueSlice'
import { canCallNext, shouldStopQueueSimulation } from './queueSimulation'

/** Dispatches call next on an interval while simulation is enabled. */
export function useQueueAutoAdvance(intervalMs: number) {
  const dispatch = useDispatch<AppDispatch>()
  const running = useSelector((s: RootState) => s.queue.simulationRunning)
  const queue = useSelector((s: RootState) => s.queue.queue)
  const stopNotifiedRef = useRef(false)

  useEffect(() => {
    if (!running || intervalMs < 1000) return
    const id = window.setInterval(() => {
      const q = store.getState().queue.queue
      if (!canCallNext(q)) return
      dispatch(callNext())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs, dispatch])

  useEffect(() => {
    if (!running) {
      stopNotifiedRef.current = false
      return
    }
    if (!shouldStopQueueSimulation(queue)) return
    dispatch(setSimulationRunning(false))
    if (!stopNotifiedRef.current) {
      stopNotifiedRef.current = true
      notify.success('No more patients waiting in queue. Simulation stopped.')
    }
  }, [queue, running, dispatch])
}
