import { type ReactNode } from 'react'
import { Dialog, type DialogProps, type DialogVariant } from './Dialog'

export interface ConfirmationDialogProps {
  open: boolean
  title?: string
  description?: ReactNode
  size?: DialogProps['size']
  variant?: DialogVariant
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  preventClose?: boolean
  titleId?: string
  className?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  onClose?: () => void
  confirmLoading?: boolean
  confirmDisabled?: boolean
  hideCancel?: boolean
  actions?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

export function ConfirmationDialog({
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
  confirmLoading = false,
  confirmDisabled = false,
  hideCancel = false,
  variant = 'default',
  actions,
  footer,
  children,
  open,
  title,
  description,
  size,
  showCloseButton,
  closeOnBackdropClick,
  closeOnEscape,
  preventClose,
  titleId,
  className,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    if (onConfirm && !confirmLoading && !confirmDisabled) {
      await onConfirm()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (onClose) {
      onClose()
    }
  }

  const getConfirmButtonClass = (variant: DialogVariant) => {
    const baseClass = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
    
    switch (variant) {
      case 'danger':
        return `${baseClass} bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20`
      case 'warning':
        return `${baseClass} bg-yellow-600 hover:bg-yellow-500 text-white shadow-md shadow-yellow-600/20`
      case 'success':
        return `${baseClass} bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/20`
      case 'info':
        return `${baseClass} bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20`
      default:
        return `${baseClass} bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/25`
    }
  }

  const defaultActions = (
    <>
      {!hideCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={confirmLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirmLoading || confirmDisabled}
        className={getConfirmButtonClass(variant)}
      >
        {confirmLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing...
          </>
        ) : (
          confirmLabel
        )}
      </button>
    </>
  )

  const actionsContent = actions || defaultActions

  return (
    <Dialog
      open={open}
      onClose={onClose || (() => {})}
      title={title}
      description={description}
      size={size}
      variant={variant}
      showCloseButton={showCloseButton}
      closeOnBackdropClick={closeOnBackdropClick}
      closeOnEscape={closeOnEscape}
      preventClose={preventClose}
      titleId={titleId}
      className={className}
    >
      {children}
      
      {(actionsContent || footer) && (
        <div className="flex flex-wrap justify-end gap-3 p-6 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-950/50 -mx-6 -mb-6 mt-6">
          {actionsContent}
          {footer}
        </div>
      )}
    </Dialog>
  )
}

export default ConfirmationDialog
