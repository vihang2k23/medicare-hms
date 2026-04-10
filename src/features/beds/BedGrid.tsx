import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Activity,
  BedDouble,
  DoorOpen,
  GripVertical,
  Plus,
  Stethoscope,
  Trash2,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react'
import type { AppDispatch, RootState } from '../../app/store'
import { notify } from '../../lib/notify'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from '../../components/ui/modalOverlayClasses'
import type { Bed, BedStatus, WardDefinition } from './bedSlice'
import {
  addBedToWard,
  assignPatientToBed,
  dischargePatientFromBed,
  removeBed,
  transferBedToWard,
  updateBedStatus,
} from './bedSlice'
import WardManagementPanel from './WardManagementPanel'

const BED_DRAG_MIME = 'application/x-medicare-bed-id'

const STATUS_STYLES: Record<
  BedStatus,
  { cell: string; dot: string; label: string }
> = {
  available: {
    cell:
      'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 ring-emerald-500/25 hover:ring-emerald-400/50',
    dot: 'bg-emerald-500',
    label: 'Available',
  },
  occupied: {
    cell: 'bg-rose-500/15 text-rose-900 dark:text-rose-100 ring-rose-500/25 hover:ring-rose-400/50',
    dot: 'bg-rose-500',
    label: 'Occupied',
  },
  reserved: {
    cell:
      'bg-amber-500/15 text-amber-950 dark:text-amber-100 ring-amber-500/25 hover:ring-amber-400/50',
    dot: 'bg-amber-500',
    label: 'Reserved',
  },
  maintenance: {
    cell:
      'bg-slate-500/20 text-slate-800 dark:text-slate-100 ring-slate-400/30 hover:ring-slate-400/45',
    dot: 'bg-slate-500',
    label: 'Maintenance',
  },
}

const STATUS_OPTIONS: { value: BedStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
]

function groupByWard(
  beds: Bed[],
  wards: WardDefinition[],
): { wardId: string; wardName: string; list: Bed[] }[] {
  const map = new Map<string, { wardName: string; list: Bed[] }>()
  for (const w of wards) {
    map.set(w.id, { wardName: w.name, list: [] })
  }
  for (const b of beds) {
    const g = map.get(b.wardId) ?? { wardName: b.wardName, list: [] }
    g.list.push(b)
    g.wardName = wards.find((w) => w.id === b.wardId)?.name ?? b.wardName
    map.set(b.wardId, g)
  }
  return [...map.entries()]
    .map(([wardId, v]) => ({
      wardId,
      wardName: v.wardName,
      list: v.list.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true })),
    }))
    .sort((a, b) => a.wardName.localeCompare(b.wardName))
}

export interface BedGridProps {
  /** When false, only the per-ward grids and detail panel are shown (e.g. dashboard). */
  showWardSummary?: boolean
  /** Add / rename / remove wards (full bed pages only; hide on compact dashboard embed). */
  showWardManagement?: boolean
}

export default function BedGrid({ showWardSummary = true, showWardManagement = false }: BedGridProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { beds, wardSummary, wards } = useSelector((state: RootState) => state.beds)
  const [activeBedId, setActiveBedId] = useState<string | null>(null)
  const [assignName, setAssignName] = useState('')
  const [assignId, setAssignId] = useState('')
  const [draggingBedId, setDraggingBedId] = useState<string | null>(null)
  const [dropTargetWardId, setDropTargetWardId] = useState<string | null>(null)

  const activeBed = activeBedId ? beds.find((b) => b.id === activeBedId) ?? null : null
  const byWard = useMemo(() => groupByWard(beds, wards), [beds, wards])

  useModalScrollLock(!!activeBedId)

  const openBed = (bed: Bed) => {
    setActiveBedId(bed.id)
    setAssignName('')
    setAssignId('')
  }

  const closePanel = () => {
    setActiveBedId(null)
    setAssignName('')
    setAssignId('')
  }

  const endDragSession = () => {
    setDraggingBedId(null)
    setDropTargetWardId(null)
  }

  const applyStatus = (bed: Bed, status: BedStatus) => {
    if (bed.status === status) return
    dispatch(updateBedStatus({ bedId: bed.id, status }))
    notify.success(`Bed ${bed.wardName} · ${bed.bedNumber} → ${STATUS_OPTIONS.find((o) => o.value === status)?.label}`)
  }

  const assign = () => {
    if (!activeBed) return
    const name = assignName.trim()
    if (!name) {
      notify.error('Enter a patient name to assign')
      return
    }
    dispatch(
      assignPatientToBed({
        bedId: activeBed.id,
        occupantName: name,
        patientId: assignId.trim() || undefined,
      }),
    )
    notify.success(`Assigned to bed ${activeBed.bedNumber}`)
    closePanel()
  }

  const discharge = () => {
    if (!activeBed) return
    dispatch(dischargePatientFromBed({ bedId: activeBed.id }))
    notify.success(`Discharged from bed ${activeBed.bedNumber}`)
    closePanel()
  }

  const removeThisBed = () => {
    if (!activeBed || activeBed.status !== 'available') return
    if (!window.confirm(`Remove empty bed ${activeBed.bedNumber} from ${activeBed.wardName}?`)) return
    dispatch(removeBed({ bedId: activeBed.id }))
    notify.success('Bed removed')
    closePanel()
  }

  const addBedInWard = (wardId: string, wardName: string) => {
    dispatch(addBedToWard({ wardId }))
    notify.success(`New bed added to ${wardName}`)
  }

  const handleWardDragOver = (e: React.DragEvent, wardId: string) => {
    if (!draggingBedId) return
    const dragged = beds.find((b) => b.id === draggingBedId)
    if (!dragged || dragged.status !== 'available') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetWardId(wardId)
  }

  const handleWardDrop = (e: React.DragEvent, targetWardId: string) => {
    e.preventDefault()
    const bedId = e.dataTransfer.getData(BED_DRAG_MIME) || e.dataTransfer.getData('text/plain')
    endDragSession()
    if (!bedId) return
    const bed = beds.find((b) => b.id === bedId)
    if (!bed || bed.status !== 'available') {
      notify.error('Only available (empty) beds can be moved to another ward')
      return
    }
    if (bed.wardId === targetWardId) {
      notify.error('This bed is already in that ward')
      return
    }
    const dest = wards.find((w) => w.id === targetWardId)
    dispatch(transferBedToWard({ bedId, targetWardId }))
    notify.success(dest ? `Bed moved to ${dest.name}` : 'Bed transferred')
  }

  return (
    <div className="space-y-6">
      {showWardManagement && <WardManagementPanel />}
      {showWardSummary && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
              <Activity className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden />
              Ward summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Live counts by ward — drag an <strong className="text-slate-600 dark:text-slate-300">available</strong> bed
              onto another ward to transfer it.
            </p>
          </div>
          {Object.keys(wardSummary).length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No ward data.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(wardSummary).map(([wardId, c]) => {
                const wardName =
                  wards.find((w) => w.id === wardId)?.name ??
                  beds.find((b) => b.wardId === wardId)?.wardName ??
                  wardId
                const total = c.available + c.occupied + c.reserved + c.maintenance
                const occPct = total === 0 ? 0 : Math.round((c.occupied / total) * 100)
                return (
                  <div
                    key={wardId}
                    className="rounded-xl border border-slate-200/70 dark:border-slate-600/80 bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-950/40 dark:to-slate-900/30 p-4 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {wardId}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{wardName}</p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-1 rounded-lg">
                        {occPct}% occ.
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-emerald-900 dark:text-emerald-100">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium">Free</span>
                        <span className="ml-auto font-bold tabular-nums">{c.available}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-2.5 py-2 text-rose-900 dark:text-rose-100">
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-medium">Occupied</span>
                        <span className="ml-auto font-bold tabular-nums">{c.occupied}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-amber-950 dark:text-amber-100">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-medium">Reserved</span>
                        <span className="ml-auto font-bold tabular-nums">{c.reserved}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-500/15 px-2.5 py-2 text-slate-800 dark:text-slate-100">
                        <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                        <span className="font-medium">Maint.</span>
                        <span className="ml-auto font-bold tabular-nums">{c.maintenance}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                      Total beds: <strong className="text-slate-700 dark:text-slate-200">{total}</strong>
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
        {(Object.keys(STATUS_STYLES) as BedStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[s].dot}`} />
            {STATUS_STYLES[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 sm:ml-2 pl-3 sm:pl-0 border-l border-slate-200 dark:border-slate-700">
          <GripVertical className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden />
          <span>
            <strong className="text-slate-700 dark:text-slate-200">Available</strong> beds: drag onto another ward
            to transfer (reserved / occupied / maintenance cannot be dragged).
          </span>
        </span>
      </div>

      <div className="space-y-6">
        {byWard.map(({ wardId, wardName, list }) => {
          const isDropTarget = dropTargetWardId === wardId && draggingBedId
          return (
            <div
              key={wardId}
              onDragOver={(e) => handleWardDragOver(e, wardId)}
              onDrop={(e) => handleWardDrop(e, wardId)}
              className={[
                'rounded-2xl border bg-white/85 dark:bg-slate-900/50 backdrop-blur-sm p-5 shadow-sm ring-1 transition-[box-shadow,ring-color,border-color] duration-200',
                isDropTarget
                  ? 'border-teal-400/80 dark:border-teal-500/50 ring-2 ring-teal-500/50 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-lg shadow-teal-500/10'
                  : 'border-slate-200/80 dark:border-slate-700/80 ring-slate-200/40 dark:ring-slate-700/40',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 min-w-0">
                  <BedDouble className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden />
                  <span className="truncate">
                    {wardName}
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs font-normal ml-1.5">
                      {wardId}
                    </span>
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => addBedInWard(wardId, wardName)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 border border-teal-200/60 dark:border-teal-800/50 transition-colors shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add bed
                </button>
              </div>
              {isDropTarget && (
                <p className="mb-3 text-xs font-medium text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" aria-hidden />
                  Drop here to move bed into this ward
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {list.map((bed) => {
                  const st = STATUS_STYLES[bed.status]
                  const canDrag = bed.status === 'available'
                  const subtitle =
                    bed.status === 'occupied'
                      ? bed.occupantName ?? bed.patientId ?? 'Occupied'
                      : bed.status === 'reserved'
                        ? 'Reserved'
                        : bed.status === 'maintenance'
                          ? 'Out of service'
                          : 'Tap · drag to ward'
                  return (
                    <button
                      key={bed.id}
                      type="button"
                      draggable={canDrag}
                      aria-grabbed={canDrag && draggingBedId === bed.id ? true : undefined}
                      title={canDrag ? 'Drag into another ward to transfer (available beds only)' : undefined}
                      onDragStart={(e) => {
                        if (!canDrag) {
                          e.preventDefault()
                          return
                        }
                        e.stopPropagation()
                        setDraggingBedId(bed.id)
                        e.dataTransfer.setData(BED_DRAG_MIME, bed.id)
                        e.dataTransfer.setData('text/plain', bed.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={endDragSession}
                      onClick={() => openBed(bed)}
                      className={[
                        'relative flex flex-col items-start rounded-xl px-3 py-3 text-left text-sm font-semibold ring-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50',
                        st.cell,
                        canDrag ? 'cursor-grab active:cursor-grabbing' : '',
                        draggingBedId === bed.id ? 'opacity-60 scale-[0.98]' : '',
                      ].join(' ')}
                    >
                      {canDrag && (
                        <span
                          className="absolute top-2 right-2 text-emerald-700/50 dark:text-emerald-300/40 pointer-events-none"
                          aria-hidden
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 w-full min-w-0 pr-5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                        <span className="truncate">Bed {bed.bedNumber}</span>
                      </span>
                      <span className="mt-1 text-[11px] font-normal opacity-85 line-clamp-2 leading-snug">
                        {subtitle}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {activeBed && (
        <div className={modalFixedRoot('z-50')} role="dialog" aria-modal="true" aria-labelledby="bed-panel-title">
          <div className={modalFixedInner}>
            <button type="button" className={modalBackdropDim} aria-label="Close bed panel" onClick={closePanel} />
            <div
              className="relative z-10 w-full max-w-md max-h-[min(90dvh,36rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-teal-500/10 to-transparent">
              <div>
                <p id="bed-panel-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activeBed.wardName} · Bed {activeBed.bedNumber}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {STATUS_STYLES[activeBed.status].label}
                  {activeBed.occupantName && (
                    <>
                      {' · '}
                      <span className="text-slate-700 dark:text-slate-200">{activeBed.occupantName}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="p-5 space-y-5 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y">
              {activeBed.status === 'available' && (
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" aria-hidden />
                  <p>
                    Drag this bed card onto another ward in the grid to transfer. Only{' '}
                    <strong className="text-slate-800 dark:text-slate-100">available</strong> beds can be moved;
                    discharge patients or change status first if needed.
                  </p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Bed status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => applyStatus(activeBed, value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold ring-1 transition-all ${
                        activeBed.status === value
                          ? 'bg-teal-600 text-white ring-teal-600 shadow-md shadow-teal-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 ring-slate-200/80 dark:ring-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeBed.status === 'available' && (
                <button
                  type="button"
                  onClick={removeThisBed}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200/90 dark:border-red-900/55 text-red-800 dark:text-red-200 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Remove bed
                </button>
              )}

              {(activeBed.status === 'available' || activeBed.status === 'reserved') && (
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                    Admit / assign
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Patient name
                    </label>
                    <input
                      value={assignName}
                      onChange={(e) => setAssignName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Patient ID (optional)
                    </label>
                    <input
                      value={assignId}
                      onChange={(e) => setAssignId(e.target.value)}
                      placeholder="Registry ID"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white/90 dark:bg-slate-950/50 text-sm font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={assign}
                    disabled={!assignName.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-45 text-white text-sm font-semibold shadow-lg shadow-teal-500/20"
                  >
                    <Stethoscope className="h-4 w-4" aria-hidden />
                    Assign to bed
                  </button>
                </div>
              )}

              {activeBed.status === 'occupied' && (
                <button
                  type="button"
                  onClick={discharge}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <DoorOpen className="h-4 w-4" aria-hidden />
                  Discharge &amp; free bed
                </button>
              )}

              {activeBed.status === 'maintenance' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Wrench className="h-4 w-4 shrink-0" aria-hidden />
                  Mark available when the bed is ready for patients again.
                </p>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
