import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Timer } from 'lucide-react'
import { store, type AppDispatch, type RootState } from '../../app/store'
import { notify } from '../../shared/lib/notify'
import { OPD_DEPARTMENTS } from '../../shared/config/departments'
import {
// QueueControls defines the Queue Controls UI surface and its primary interaction flow.
  callNext,
  completeCurrent,
  formatOpdTokenLabel,
  issueToken,
  resetQueue,
  setSimulationRunning,
  skipCurrent,
} from './queueSlice'
import { canCallNext, canStartQueueSimulation } from './queueSimulation'

const SIM_INTERVALS = [
  { label: '30 seconds (recommended)', ms: 30000 },
  { label: '15 seconds', ms: 15000 },
  { label: '8 seconds', ms: 8000 },
  { label: '4 seconds', ms: 4000 },
] as const

export interface QueueControlsProps {
  simulationIntervalMs?: number
  onSimulationIntervalChange?: (ms: number) => void
}

// QueueControls renders the queue controls UI.
export default function QueueControls({
  simulationIntervalMs = 30000,
  onSimulationIntervalChange,
}: QueueControlsProps) {
  const dispatch = useDispatch<AppDispatch>()
  const currentToken = useSelector((s: RootState) => s.queue.currentToken)
  const simulationRunning = useSelector((s: RootState) => s.queue.simulationRunning)
  const queue = useSelector((s: RootState) => s.queue.queue)
  const scheduleDoctors = useSelector((s: RootState) => s.appointments.doctors)
  const canStartSimulation = canStartQueueSimulation(queue)
  const callNextEnabled = canCallNext(queue)
  const [patientName, setPatientName] = useState('')

  const issue = () => {
    const name = patientName.trim()
    if (!name) return
    dispatch(
      issueToken({
        patientName: name,
        department: OPD_DEPARTMENTS[0],
        scheduleDoctors,
      }),
    )
    setPatientName('')
    const q = store.getState().queue.queue
    const last = q[q.length - 1]
    if (last) {
      notify.success(`${formatOpdTokenLabel(last.tokenId)} issued for ${last.patientName} (${last.department})`)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 space-y-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <h3 className="text-xs font-bold text-slate-500 dark:text-white uppercase tracking-[0.14em]">Issue token</h3>
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-white mb-1">Patient name</label>
        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Walk-in or registered name"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-white">
        Tokens are issued for <strong className="text-slate-600 dark:text-white">{OPD_DEPARTMENTS[0]}</strong>.
        Doctor is picked from the appointment schedule when their department matches (including NPI-imported doctors).
      </p>
      <button
        type="button"
        onClick={issue}
        disabled={!patientName.trim()}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all"
      >
        Generate token
      </button>

      <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-white uppercase tracking-[0.14em]">Desk actions</h3>
        <p className="text-xs text-slate-500 dark:text-white">
          Active token:{' '}
          <span className="font-mono text-slate-700 dark:text-white">
            {currentToken != null ? formatOpdTokenLabel(currentToken) : 'None'}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!canCallNext(store.getState().queue.queue)) return
              dispatch(callNext())
              const { queue: qAfter, currentToken: cur } = store.getState().queue
              if (cur != null) {
                notify.success(`Now serving ${formatOpdTokenLabel(cur)}`)
                return
              }
              if (qAfter.length === 0) {
                notify.success(
                  'No more patients waiting in queue. Issue a token when the next patient arrives.',
                )
              } else {
                notify.success('No more patients waiting in queue.')
              }
            }}
            disabled={!callNextEnabled}
            title={
              !callNextEnabled
                ? 'No one is waiting or in consultation — issue a token or wait for the queue to have patients'
                : undefined
            }
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all"
          >
            Call next
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentToken == null) return
              dispatch(completeCurrent())
              notify.success('Visit marked complete')
            }}
            disabled={currentToken == null}
            className="px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-slate-700 dark:text-white text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 transition-colors"
          >
            Complete current
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentToken == null) return
              dispatch(skipCurrent())
              notify.success('Patient moved to the end of the queue.')
            }}
            disabled={currentToken == null}
            className="px-4 py-2.5 rounded-xl border border-amber-200/90 dark:border-amber-800/80 text-amber-900 dark:text-white text-sm font-semibold hover:bg-amber-50/80 dark:hover:bg-amber-950/30 disabled:opacity-40 transition-colors"
          >
            Skip &amp; re-queue
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all tokens in this session?')) {
                dispatch(resetQueue())
                notify.success('Queue cleared')
              }
            }}
            className="px-4 py-2.5 rounded-xl text-red-600 dark:text-white text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            Reset queue
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-white uppercase tracking-[0.14em] flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          Auto-advance (simulation)
        </h3>
        <p className="text-xs text-slate-500 dark:text-white leading-relaxed">
          Fires &ldquo;Call next&rdquo; every {simulationIntervalMs / 1000}s while running. Starts only when someone is
          waiting; stops automatically when the queue has no waiting or in-consultation patients.
        </p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-center">
          <label className="text-xs font-medium text-slate-600 dark:text-white shrink-0">Interval</label>
          <select
            value={simulationIntervalMs}
            onChange={(e) => onSimulationIntervalChange?.(Number(e.target.value))}
            disabled={!onSimulationIntervalChange}
            className="sm:flex-1 min-w-[10rem] px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
          >
            {SIM_INTERVALS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (simulationRunning) {
                dispatch(setSimulationRunning(false))
                notify.success('Simulation stopped')
                return
              }
              if (!canStartSimulation) {
                notify.error('Issue at least one token (waiting) before starting simulation.')
                return
              }
              dispatch(setSimulationRunning(true))
              notify.success('Simulation on — calling next automatically')
            }}
            disabled={!simulationRunning && !canStartSimulation}
            title={
              !simulationRunning && !canStartSimulation
                ? 'No more patients waiting in queue'
                : undefined
            }
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-45 ${
              simulationRunning
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25 hover:bg-violet-500'
                : 'border border-violet-200/90 dark:border-violet-800/80 text-violet-800 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-950/40'
            }`}
          >
            {simulationRunning ? 'Stop simulation' : 'Start simulation'}
          </button>
        </div>
      </div>
    </div>
  )
}
