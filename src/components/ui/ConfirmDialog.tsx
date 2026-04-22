import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from './modalOverlayClasses'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'

import type { ConfirmDialogProps } from '../../types'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmLoading = false,
  confirmDisabled = false,
  titleId = 'confirm-dialog-title',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useModalScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 disabled:opacity-60'
      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/25 disabled:opacity-60'

  const busy = confirmLoading || confirmDisabled

  return (
    <ModalPortal>
      <div
        className={modalFixedRoot('z-[140]')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={modalFixedInner}>
          <button type="button" className={modalBackdropDim} aria-label={cancelLabel} onClick={onCancel} />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/25 ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5">
              <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white pr-2">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {description ? (
              <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed -mt-2">{description}</div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 p-5 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirmLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={busy}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmClass}`}
              >
                {confirmLoading ? '…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
