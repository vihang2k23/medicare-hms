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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Issue token</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Patient name</label>
          <input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Walk-in or registered name"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Counter / department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm"
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
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium"
      >
        Generate token
      </button>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Desk actions</h3>
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
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
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
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-40"
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
            className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-medium disabled:opacity-40"
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
            className="px-3 py-2 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Reset queue
          </button>
        </div>
      </div>
    </div>
  )
}
