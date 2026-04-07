import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, ChevronUp, FileText, History, Printer } from 'lucide-react'
import type { AppDispatch, RootState } from '../app/store'
import { useAuth } from '../hooks/useAuth'
import { removePrescription, updatePrescriptionStatus } from '../features/prescriptions/prescriptionsSlice'
import type { Prescription, PrescriptionStatus } from '../features/prescriptions/types'
import PrescriptionForm from '../features/prescriptions/PrescriptionForm'
import { notify } from '../lib/notify'

export type PrescriptionsVariant = 'admin' | 'doctor'

interface PrescriptionsPageProps {
  variant?: PrescriptionsVariant
}

function formatWhen(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function PrescriptionHistoryRow({
  rx,
  expanded,
  onToggle,
  canManage,
  onStatus,
  onDelete,
  printBasePath,
}: {
  rx: Prescription
  expanded: boolean
  onToggle: () => void
  canManage: boolean
  onStatus: (id: string, s: PrescriptionStatus) => void
  onDelete: (id: string) => void
  /** e.g. `/admin/prescriptions` — links to printable layout */
  printBasePath: string
}) {
  const recallCount = rx.medicines.reduce((n, m) => n + (m.recallAlerts?.length ?? 0), 0)

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/40 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 flex items-start gap-3 p-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors min-w-0"
      >
        <div className="mt-0.5 text-sky-600 dark:text-sky-400 shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            
            <span className="font-semibold text-slate-900 dark:text-slate-100">{rx.patientName}</span>
            <span className="text-xs font-mono text-sky-600 dark:text-sky-400">{rx.patientId}</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                rx.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                  : rx.status === 'completed'
                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
              }`}
            >
              {rx.status}
            </span>
            {recallCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                Demo recall flags ({recallCount})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatWhen(rx.createdAt)} · {rx.doctorName} · {rx.medicines.length} medicine(s)
          </p>
          {rx.diagnosis && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{rx.diagnosis}</p>
          )}
        </div>
      </button>
      <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 shrink-0">
        <Link
          to={`${printBasePath}/${rx.id}/print`}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-4 text-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 dark:hover:bg-sky-500/15 transition-colors"
          title="Open printable prescription (PDF via browser print)"
          aria-label="Open printable prescription"
        >
          <Printer className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sm:hidden">PDF view</span>
        </Link>
      </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <ul className="space-y-2 text-sm">
            {rx.medicines.map((m) => (
              <li
                key={m.id}
                className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200"
              >
                <span className="font-medium">{m.drugName}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {' '}
                  — {m.dosage}, {m.frequency}
                  {m.duration ? ` · ${m.duration}` : ''}
                </span>
                {m.instructions && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.instructions}</p>
                )}
              </li>
            ))}
          </ul>
          {rx.notes && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Notes:</span> {rx.notes}
            </p>
          )}
          {canManage && rx.status === 'active' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => onStatus(rx.id, 'completed')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100"
              >
                Mark completed
              </button>
              <button
                type="button"
                onClick={() => onStatus(rx.id, 'cancelled')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              >
                Cancel Rx
              </button>
              <button
                type="button"
                onClick={() => onDelete(rx.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              >
                Delete record
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PrescriptionsPage({ variant = 'doctor' }: PrescriptionsPageProps) {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const all = useSelector((s: RootState) => s.prescriptions.prescriptions)
  const [searchParams, setSearchParams] = useSearchParams()
  const patientPrefill = searchParams.get('patient')
  const [tab, setTab] = useState<'new' | 'history'>(() => (patientPrefill ? 'new' : 'history'))
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const visible = useMemo(() => {
    let list = variant === 'admin' ? all : all.filter((r) => r.doctorId === user?.id)
    const qq = q.trim().toLowerCase()
    if (qq) {
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(qq) ||
          r.patientId.toLowerCase().includes(qq) ||
          r.doctorName.toLowerCase().includes(qq),
      )
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [all, variant, user?.id, q])

  const onStatus = (id: string, status: PrescriptionStatus) => {
    dispatch(updatePrescriptionStatus({ id, status }))
    notify.success(status === 'completed' ? 'Marked completed.' : 'Prescription cancelled.')
  }

  const onDelete = (id: string) => {
    if (!window.confirm('Remove this prescription record from history?')) return
    dispatch(removePrescription(id))
    notify.success('Removed.')
    setExpandedId((e) => (e === id ? null : e))
  }

  const accent =
    variant === 'admin'
      ? 'text-sky-600 dark:text-sky-400'
      : 'text-emerald-600 dark:text-emerald-400'

  const printBasePath = variant === 'admin' ? '/admin/prescriptions' : '/doctor/prescriptions'

  return (
    <div className="space-y-8">
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 ${accent}`}>Week 7 · Clinical</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Prescriptions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Write multi-line prescriptions using the bundled <strong className="font-medium text-slate-700 dark:text-slate-200">drug catalog</strong>, run{' '}
          <strong className="font-medium text-slate-700 dark:text-slate-200">demo recall</strong> checks (static training data), and browse saved history.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/50 ring-1 ring-slate-200/60 dark:ring-slate-700/60 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'new'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          New prescription
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'history'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          History ({visible.length})
        </button>
      </div>

      {tab === 'new' && (
        <PrescriptionForm
          variant={variant}
          initialPatientId={patientPrefill}
          onSaved={() => {
            setSearchParams({})
            setTab('history')
          }}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-4 sm:p-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Filter
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Patient name, ID, or prescriber…"
              className="w-full max-w-md px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
            />
            {variant === 'doctor' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Showing prescriptions you authored (demo user id: {user?.id ?? '—'}).
              </p>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              No prescriptions yet. Open <strong>New prescription</strong> to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((rx) => (
                <PrescriptionHistoryRow
                  key={rx.id}
                  rx={rx}
                  expanded={expandedId === rx.id}
                  onToggle={() => setExpandedId((id) => (id === rx.id ? null : rx.id))}
                  canManage={variant === 'admin' || rx.doctorId === user?.id}
                  onStatus={onStatus}
                  onDelete={onDelete}
                  printBasePath={printBasePath}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
