import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../app/store'
import { callNext } from './queueSlice'

/** Dispatches call next on an interval while simulation is enabled. */
export function useQueueAutoAdvance(intervalMs: number) {
  const dispatch = useDispatch<AppDispatch>()
  const running = useSelector((s: RootState) => s.queue.simulationRunning)

  useEffect(() => {
    if (!running || intervalMs < 1000) return
    const id = window.setInterval(() => {
      dispatch(callNext())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs, dispatch])
}
