import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Printer,
  Search,
  Stethoscope,
  User,
  X,
} from 'lucide-react'
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

function formatDateShort(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeShort(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const STATUS_STYLES: Record<
  PrescriptionStatus,
  { pill: string; bar: string; label: string }
> = {
  active: {
    label: 'Active',
    pill:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-100 ring-1 ring-emerald-300/60 dark:ring-emerald-700/50',
    bar: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    pill:
      'bg-slate-100 text-slate-800 dark:bg-slate-700/80 dark:text-slate-100 ring-1 ring-slate-200/80 dark:ring-slate-600',
    bar: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    pill:
      'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100 ring-1 ring-red-200 dark:ring-red-900/60',
    bar: 'bg-red-500',
  },
}

type StatusFilter = 'all' | PrescriptionStatus

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function PrescriptionHistoryCard({
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
  printBasePath: string
}) {
  const recallCount = rx.medicines.reduce((n, m) => n + (m.recallAlerts?.length ?? 0), 0)
  const st = STATUS_STYLES[rx.status]
  const medCount = rx.medicines.length

  return (
    <article
      className={`rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden flex flex-col min-w-0 ring-1 ring-slate-200/30 dark:ring-slate-800/50`}
    >
      <div className="flex min-w-0">
        <div className={`w-1 shrink-0 ${st.bar}`} aria-hidden />
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3 flex-1">
              <div className="flex flex-wrap items-start gap-3 gap-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Calendar className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-semibold text-slate-800 dark:text-slate-100">
                      {formatDateShort(rx.createdAt)}
                    </span>
                    <span className="text-[11px]">{formatTimeShort(rx.createdAt)}</span>
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="sr-only">Patient</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                      {rx.patientName}
                    </span>
                    <span className="text-xs font-mono text-sky-700 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md">
                      {rx.patientId}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${st.pill}`}
                    >
                      {st.label}
                    </span>
                    {recallCount > 0 && (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100 ring-1 ring-amber-200/80 dark:ring-amber-800/50"
                        title="Demo recall check flags"
                      >
                        Recall note{recallCount > 1 ? 's' : ''} ({recallCount})
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
                      <span className="sr-only">Prescriber</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{rx.doctorName}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                      ·
                    </span>
                    <span>
                      {medCount} medicine{medCount === 1 ? '' : 's'}
                    </span>
                  </p>
                  {rx.diagnosis && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed border-l-2 border-sky-400/60 pl-3">
                      {rx.diagnosis}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 shrink-0 lg:items-end">
              <Link
                to={`${printBasePath}/${rx.id}/print`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 shadow-sm transition-colors"
              >
                <Printer className="h-4 w-4 shrink-0" aria-hidden />
                Print / PDF
              </Link>
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                    View medicines
                  </>
                )}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-5 pt-5 border-t border-slate-200/90 dark:border-slate-700/80 space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Medicines on this prescription
                </h3>
                <ul className="rounded-xl border border-slate-200/80 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/30">
                  {rx.medicines.map((m) => (
                    <li key={m.id} className="px-3 py-3 sm:px-4 sm:py-3.5 text-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">{m.drugName}</div>
                      <dl className="mt-1.5 grid gap-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-slate-400 dark:text-slate-500 font-medium">Dosage</dt>
                          <dd>{m.dosage}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400 dark:text-slate-500 font-medium">Frequency</dt>
                          <dd>{m.frequency}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400 dark:text-slate-500 font-medium">Duration</dt>
                          <dd>{m.duration ?? '—'}</dd>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4">
                          <dt className="text-slate-400 dark:text-slate-500 font-medium">Instructions</dt>
                          <dd className="mt-0.5">{m.instructions ?? '—'}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </div>

              {rx.notes && (
                <div className="rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-900/40 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-1">
                    Pharmacy / notes
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{rx.notes}</p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Rx record id: {rx.id}</p>

              {canManage && rx.status === 'active' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onStatus(rx.id, 'completed')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                  >
                    Mark completed
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus(rx.id, 'cancelled')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Cancel prescription
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rx.id)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors ml-auto"
                  >
                    Delete record
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const roleScoped = useMemo(() => {
    return variant === 'admin' ? all : all.filter((r) => r.doctorId === user?.id)
  }, [all, variant, user?.id])

  const visible = useMemo(() => {
    let list = roleScoped
    const qq = q.trim().toLowerCase()
    if (qq) {
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(qq) ||
          r.patientId.toLowerCase().includes(qq) ||
          r.doctorName.toLowerCase().includes(qq),
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [roleScoped, q, statusFilter])

  const counts = useMemo(() => {
    const c = { all: roleScoped.length, active: 0, completed: 0, cancelled: 0 }
    for (const r of roleScoped) {
      if (r.status === 'active') c.active += 1
      else if (r.status === 'completed') c.completed += 1
      else c.cancelled += 1
    }
    return c
  }, [roleScoped])

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

  const hasAnyRx = roleScoped.length > 0
  const emptyDueToFilter = hasAnyRx && visible.length === 0

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
          History
          <span className="tabular-nums rounded-md bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 text-xs">
            {counts.all}
          </span>
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
        <section className="space-y-5" aria-labelledby="rx-history-heading">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2
                id="rx-history-heading"
                className="text-lg font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Prescription history
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {visible.length === counts.all
                  ? `${counts.all} record${counts.all === 1 ? '' : 's'} · Newest first`
                  : `Showing ${visible.length} of ${counts.all} record${counts.all === 1 ? '' : 's'}`}
              </p>
            </div>
            {variant === 'doctor' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-right max-w-md">
                Only prescriptions you prescribed are listed (demo user <span className="font-mono">{user?.id ?? '—'}</span>
                ).
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 p-4 sm:p-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-4">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                aria-hidden
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by patient name, patient ID, or prescriber…"
                aria-label="Search prescriptions"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-950/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50"
              />
              {q.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Status
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                {STATUS_FILTERS.map(({ id, label }) => {
                  const count =
                    id === 'all'
                      ? counts.all
                      : id === 'active'
                        ? counts.active
                        : id === 'completed'
                          ? counts.completed
                          : counts.cancelled
                  const active = statusFilter === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatusFilter(id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label}
                      <span
                        className={`tabular-nums text-xs px-1.5 py-0.5 rounded-md ${
                          active
                            ? 'bg-white/20 dark:bg-slate-900/20'
                            : 'bg-white/60 dark:bg-slate-900/40'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {!hasAnyRx ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 px-6 py-14 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-4">
                <FileText className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-semibold">No prescriptions yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                When you save a prescription, it will appear here. Switch to <strong>New prescription</strong> to create
                one.
              </p>
            </div>
          ) : emptyDueToFilter ? (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-6 py-10 text-center">
              <p className="text-slate-800 dark:text-slate-100 font-semibold">No matches</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Try another status filter or clear your search — {counts.all} prescription{counts.all === 1 ? '' : 's'}{' '}
                hidden by filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  setStatusFilter('all')
                }}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <ul className="space-y-4 list-none p-0 m-0">
              {visible.map((rx) => (
                <li key={rx.id}>
                  <PrescriptionHistoryCard
                    rx={rx}
                    expanded={expandedId === rx.id}
                    onToggle={() => setExpandedId((id) => (id === rx.id ? null : rx.id))}
                    canManage={variant === 'admin' || rx.doctorId === user?.id}
                    onStatus={onStatus}
                    onDelete={onDelete}
                    printBasePath={printBasePath}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
