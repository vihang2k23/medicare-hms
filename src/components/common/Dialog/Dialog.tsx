import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModalScrollLock } from '../../../hooks/useModalScrollLock'

// =============================================================================
// INLINE MODAL CLASSES
// =============================================================================

/** Fixed root: scrollable so tall modals / small viewports can move; overscroll stays in overlay. */
function modalFixedRoot(zClass: string) {
  return `fixed inset-0 ${zClass} overflow-y-auto overscroll-y-contain`
}

/**
 * At least one dynamic viewport tall so flex centering is true vertical center (not stuck to bottom).
 * Use with createPortal -> body for reliable placement under app layout scroll/transform.
 */
const modalFixedInner =
  'relative box-border flex min-h-[100dvh] w-full max-w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-12'

/** Full-bleed dim layer behind the panel (inside scrollable column). */
const modalBackdropDim = 'absolute inset-0 min-h-full min-w-full bg-slate-950/50 backdrop-blur-sm'

// Modal size variants
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto'

// Modal variant styles
export type DialogVariant = 'default' | 'danger' | 'warning' | 'success' | 'info'

// Base modal props
export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean
  onClose: () => void
  title?: string
  description?: ReactNode
  size?: DialogSize
  variant?: DialogVariant
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  preventClose?: boolean
  titleId?: string
  className?: string
  children?: ReactNode
}

// Size configurations
const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] w-[95vw]',
  auto: 'max-w-none w-auto'
}

// Variant configurations
const variantClasses: Record<DialogVariant, string> = {
  default: 'border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900',
  danger: 'border-red-200/90 dark:border-red-800/90 bg-white dark:bg-slate-900 ring-red-200/60 dark:ring-red-800/60',
  warning: 'border-yellow-200/90 dark:border-yellow-800/90 bg-white dark:bg-slate-900 ring-yellow-200/60 dark:ring-yellow-800/60',
  success: 'border-green-200/90 dark:border-green-800/90 bg-white dark:bg-slate-900 ring-green-200/60 dark:ring-green-800/60',
  info: 'border-blue-200/90 dark:border-blue-800/90 bg-white dark:bg-slate-900 ring-blue-200/60 dark:ring-blue-800/60'
}

// Dialog Component
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventClose = false,
  titleId,
  className = '',
  children,
  ...props
}: DialogProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [generatedTitleId] = useState(() => titleId || `dialog-title-${Math.random().toString(36).substr(2, 9)}`)

  useModalScrollLock(open)

  useEffect(() => {
    if (!open || !closeOnEscape || preventClose) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, closeOnEscape, onClose, preventClose])

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus()
    }
  }, [open])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && !preventClose && e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    if (!preventClose) {
      onClose()
    }
  }

  return createPortal(
    <div
      ref={modalRef}
      className={modalFixedRoot('z-[140]')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? generatedTitleId : undefined}
      tabIndex={-1}
      {...props}
    >
      <div className={modalFixedInner}>
        <button
          type="button"
          className={modalBackdropDim}
          aria-label="Close dialog"
          onClick={handleBackdropClick}
          disabled={preventClose}
        />
        <div
          className={`
            relative z-10 w-full rounded-2xl shadow-2xl shadow-slate-900/25 ring-1 overflow-hidden
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-200/80 dark:border-slate-700/80">
              {title && (
                <h2 id={generatedTitleId} className="text-lg font-bold text-slate-900 dark:text-white pr-2">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Close"
                  disabled={preventClose}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              )}
            </div>
          )}
          
          {description && (
            <div className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
              {description}
            </div>
          )}

          {children && (
            <div className="px-6 pb-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Dialog
