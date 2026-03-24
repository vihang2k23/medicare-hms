import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { store, type AppDispatch, type RootState } from '../../app/store'
import { notify } from '../../lib/notify'
import { callNext, completeCurrent, issueToken, resetQueue, skipCurrent } from './queueSlice'

const DEPARTMENTS = ['General OPD', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Other'] as const

export default function QueueControls() {
  const dispatch = useDispatch<AppDispatch>()
  const { currentToken } = useSelector((state: RootState) => state.queue)
  const [patientName, setPatientName] = useState('')
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0])

  const issue = () => {
    const name = patientName.trim()
    if (!name) return
    dispatch(issueToken({ patientName: name, department: department || undefined }))
    setPatientName('')
    const tokens = store.getState().queue.tokens
    const last = tokens[tokens.length - 1]
    if (last) {
      notify.success(`Token ${last.tokenNumber} issued for ${last.patientName}`)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 space-y-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.14em]">Issue token</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Patient name</label>
          <input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Walk-in or registered name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Counter / department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={issue}
        disabled={!patientName.trim()}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all"
      >
        Generate token
      </button>

      <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.14em]">Desk actions</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Active token: <span className="font-mono text-slate-700 dark:text-slate-200">{currentToken ?? 'None'}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              dispatch(callNext())
              const cur = store.getState().queue.currentToken
              if (cur) notify.success(`Now serving ${cur}`)
              else notify.success('Queue updated — no active token right now')
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all"
          >
            Call next
          </button>
          <button
            type="button"
            onClick={() => {
              if (!currentToken) return
              dispatch(completeCurrent())
              notify.success('Visit marked complete')
            }}
            disabled={!currentToken}
            className="px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 transition-colors"
          >
            Complete current
          </button>
          <button
            type="button"
            onClick={() => {
              if (!currentToken) return
              dispatch(skipCurrent())
              notify.success('Token skipped — next patient called if available')
            }}
            disabled={!currentToken}
            className="px-4 py-2.5 rounded-xl border border-amber-200/90 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-sm font-semibold hover:bg-amber-50/80 dark:hover:bg-amber-950/30 disabled:opacity-40 transition-colors"
          >
            Skip &amp; next
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all tokens in this session?')) {
                dispatch(resetQueue())
                notify.success('Queue cleared')
              }
            }}
            className="px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            Reset queue
          </button>
        </div>
      </div>
    </div>
  )
}
