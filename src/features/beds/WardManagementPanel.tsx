import { useState, type ReactNode } from 'react'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'
import { modalBackdropDimStrong, modalFixedInner, modalFixedRoot } from '../../components/ui/modalOverlayClasses'
import { useDispatch, useSelector } from 'react-redux'
import { Building2, Layers, Pencil, Plus, Shield, Trash2, X } from 'lucide-react'
import type { AppDispatch, RootState } from '../../app/store'
import { notify } from '../../lib/notify'
import { addWard, removeWard, updateWard } from './bedSlice'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/35 focus:border-teal-400/40 transition-[box-shadow,border-color]'

function ModalShell({
  title,
  description,
  children,
  onClose,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  footer: ReactNode
}) {
  return (
    <div className={modalFixedRoot('z-[60]')} role="dialog" aria-modal="true" aria-labelledby="ward-modal-title">
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDimStrong} aria-label="Close dialog" onClick={onClose} />
        <div
          className="relative z-10 w-full max-w-[420px] max-h-[min(90dvh,32rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/80 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-black/50 ring-1 ring-slate-200/50 dark:ring-slate-700/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/[0.08] via-transparent to-sky-500/[0.06] dark:from-teal-500/15 dark:to-sky-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="ward-modal-title" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/80 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 touch-pan-y">
          {children}
        </div>
        <div className="shrink-0 px-5 py-4 bg-slate-50/90 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-2">
          {footer}
        </div>
        </div>
      </div>
    </div>
  )
}

export default function WardManagementPanel() {
  const dispatch = useDispatch<AppDispatch>()
  const { wards, beds } = useSelector((s: RootState) => s.beds)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [removeId, setRemoveId] = useState<string | null>(null)

  useModalScrollLock(addOpen || editId != null || removeId != null)

  const bedCountFor = (wardId: string) => beds.filter((b) => b.wardId === wardId).length

  const submitAdd = () => {
    const name = addName.trim()
    if (!name) {
      notify.error('Enter a ward name')
      return
    }
    dispatch(addWard({ name }))
    notify.success(`Ward “${name}” added with one available bed`)
    setAddName('')
    setAddOpen(false)
  }

  const openEdit = (wardId: string, name: string) => {
    setEditId(wardId)
    setEditName(name)
  }

  const submitEdit = () => {
    if (!editId) return
    const name = editName.trim()
    if (!name) {
      notify.error('Enter a ward name')
      return
    }
    dispatch(updateWard({ wardId: editId, name }))
    notify.success('Ward updated')
    setEditId(null)
  }

  const confirmRemove = () => {
    if (!removeId) return
    const n = bedCountFor(removeId)
    dispatch(removeWard({ wardId: removeId }))
    notify.success(n > 0 ? `Ward removed (${n} bed(s) deleted)` : 'Ward removed')
    setRemoveId(null)
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/55 backdrop-blur-sm shadow-sm shadow-slate-200/25 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100/90 dark:border-slate-800/90 bg-gradient-to-r from-slate-50/95 via-white to-teal-50/40 dark:from-slate-950/80 dark:via-slate-900/60 dark:to-teal-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-500/30">
              <Building2 className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                Ward registry
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                Manage wards
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                <Shield className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5 text-teal-600/80 dark:text-teal-400/90" aria-hidden />
                Administrator only. New wards include one empty bed. Removing a ward deletes all beds in it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddName('')
              setAddOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition-colors shrink-0 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add ward
          </button>
        </div>

        <div className="p-5">
          {wards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/40 px-6 py-10 text-center">
              <Layers className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" aria-hidden />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No wards yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use Add ward to create your first ward.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {wards.map((w) => {
                const n = bedCountFor(w.id)
                return (
                  <li
                    key={w.id}
                    className="relative flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-600/70 bg-gradient-to-br from-white to-slate-50/90 dark:from-slate-900/80 dark:to-slate-950/60 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/40 hover:ring-teal-300/50 dark:hover:ring-teal-700/40 transition-[box-shadow,ring-color] hover:shadow-md"
                  >
                    <span
                      className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-teal-500 dark:bg-teal-400"
                      aria-hidden
                    />
                    <div className="pl-3 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white leading-snug truncate pr-2">{w.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                          {w.id}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md">
                          {n} bed{n === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="pl-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/90 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(w.id, w.name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveId(w.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50/90 dark:bg-red-950/35 border border-red-200/80 dark:border-red-900/50 hover:bg-red-100/90 dark:hover:bg-red-950/55 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {addOpen && (
        <ModalShell
          title="Add ward"
          description="Creates a new ward with one available bed. You can manage beds in the grid below."
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdd}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20"
              >
                Create ward
              </button>
            </>
          }
        >
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Ward name
          </label>
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="e.g. Maternity Ward"
            className={inputClass}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd()
            }}
          />
        </ModalShell>
      )}

      {editId && (
        <ModalShell
          title="Rename ward"
          description="Updates the display name on all beds in this ward."
          onClose={() => setEditId(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20"
              >
                Save changes
              </button>
            </>
          }
        >
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-3 px-2 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 w-fit">
            {editId}
          </p>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Ward name
          </label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={inputClass}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEdit()
            }}
          />
        </ModalShell>
      )}

      {removeId && (
        <ModalShell
          title="Remove this ward?"
          description="This action cannot be undone in the current session."
          onClose={() => setRemoveId(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRemoveId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20"
              >
                Remove ward
              </button>
            </>
          }
        >
          <div className="rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/25 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <p>
              You are about to remove{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {wards.find((w) => w.id === removeId)?.name ?? removeId}
              </span>{' '}
              and{' '}
              <span className="font-semibold tabular-nums">
                {bedCountFor(removeId)} bed{bedCountFor(removeId) === 1 ? '' : 's'}
              </span>
              .
            </p>
          </div>
        </ModalShell>
      )}
    </>
  )
}
