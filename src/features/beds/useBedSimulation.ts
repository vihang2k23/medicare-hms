import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../app/store'
import { runBedSimulationTick } from './bedSlice'

const DEFAULT_INTERVAL_MS = 45_000

/** Dispatches random bed updates on an interval while bed simulation is enabled (navbar). */
export function useBedSimulation(intervalMs = DEFAULT_INTERVAL_MS) {
  const dispatch = useDispatch<AppDispatch>()
  const running = useSelector((s: RootState) => s.beds.bedSimulationRunning)

  useEffect(() => {
    if (!running || intervalMs < 5000) return
    const id = window.setInterval(() => {
      dispatch(runBedSimulationTick())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs, dispatch])
}
