import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Dialog as Modal, ConfirmationDialog, type DialogProps as BaseModalProps, type ConfirmationDialogProps as ConfirmModalProps, type DialogSize, type DialogVariant } from '../components/common'

// AlertModal shim using ConfirmationDialog
function AlertModal({ actionLabel = 'OK', onAction, variant = 'info', ...props }: Omit<ConfirmModalProps, 'confirmLabel' | 'cancelLabel' | 'hideCancel'> & {
  actionLabel?: string
  onAction?: () => void | Promise<void>
}) {
  const handleAction = async () => {
    if (onAction) {
      await onAction()
    }
    props.onClose?.()
  }

  return (
    <ConfirmationDialog
      {...props}
      confirmLabel={actionLabel}
      onConfirm={handleAction}
      hideCancel={true}
      variant={variant}
    />
  )
}

type AlertModalProps = Omit<ConfirmModalProps, 'confirmLabel' | 'cancelLabel' | 'hideCancel'> & {
  actionLabel?: string
  onAction?: () => void | Promise<void>
}

// Global modal types
export interface GlobalModalConfig {
  id?: string
  type: 'custom' | 'confirm' | 'alert'
  props?: BaseModalProps | ConfirmModalProps | AlertModalProps
  content?: ReactNode
  title?: string
  description?: ReactNode
  size?: DialogSize
  variant?: DialogVariant
}

// Simplified interface for showModal
export interface ShowModalConfig {
  id?: string
  title?: string
  description?: ReactNode
  size?: DialogSize
  variant?: DialogVariant
  content?: ReactNode
}

interface ModalContextValue {
  // Show modal with custom content
  showModal: (config: ShowModalConfig) => string
  // Show confirmation modal
  showConfirm: (config: Omit<ConfirmModalProps, 'open' | 'onClose'>) => Promise<boolean>
  // Show alert modal
  showAlert: (config: Omit<AlertModalProps, 'open' | 'onClose'>) => Promise<void>
  // Close specific modal
  closeModal: (id?: string) => void
  // Close all modals
  closeAllModals: () => void
  // Current active modals
  activeModals: GlobalModalConfig[]
}

const ModalContext = createContext<ModalContextValue | null>(null)

// Modal Provider Component
export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<GlobalModalConfig[]>([])
  const [confirmResolvers, setConfirmResolvers] = useState<Map<string, (value: boolean) => void>>(new Map())
  const [alertResolvers, setAlertResolvers] = useState<Map<string, () => void>>(new Map())

  const generateId = () => `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const showModal = useCallback((config: ShowModalConfig) => {
    const id = config.id || generateId()
    
    // Create the modal props from the configuration
    const modalProps: BaseModalProps = {
      open: true,
      onClose: () => {
        setModals(prev => prev.filter(m => m.id !== id))
      },
      title: config.title,
      description: config.description,
      size: config.size || 'md',
      variant: config.variant || 'default'
    }
    
    const newModal: GlobalModalConfig = {
      id,
      type: 'custom',
      props: modalProps,
      content: config.content
    }
    
    setModals(prev => [...prev, newModal])
    return id
  }, [])

  const showConfirm = useCallback((config: Omit<ConfirmModalProps, 'open' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      const id = generateId()
      const modalConfig: GlobalModalConfig = {
        id,
        type: 'confirm',
        props: {
          ...config,
          open: true,
          onClose: () => {
            setModals(prev => prev.filter(m => m.id !== id))
            setConfirmResolvers(prev => {
              const newMap = new Map(prev)
              newMap.delete(id)
              return newMap
            })
          }
        }
      }

      setConfirmResolvers(prev => new Map(prev).set(id, resolve))
      setModals(prev => [...prev, modalConfig])
    })
  }, [])

  const showAlert = useCallback((config: Omit<AlertModalProps, 'open' | 'onClose'>) => {
    return new Promise<void>((resolve) => {
      const id = generateId()
      const modalConfig: GlobalModalConfig = {
        id,
        type: 'alert',
        props: {
          ...config,
          open: true,
          onClose: () => {
            setModals(prev => prev.filter(m => m.id !== id))
            setAlertResolvers(prev => {
              const newMap = new Map(prev)
              newMap.delete(id)
              return newMap
            })
            resolve()
          }
        }
      }

      setAlertResolvers(prev => new Map(prev).set(id, resolve))
      setModals(prev => [...prev, modalConfig])
    })
  }, [])

  const closeModal = useCallback((id?: string) => {
    if (id) {
      setModals(prev => prev.filter(m => m.id !== id))
      setConfirmResolvers(prev => {
        const resolver = prev.get(id)
        if (resolver) resolver(false)
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      setAlertResolvers(prev => {
        const resolver = prev.get(id)
        if (resolver) resolver()
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [])

  const closeAllModals = useCallback(() => {
    setModals([])
    // Resolve all pending promises
    confirmResolvers.forEach(resolver => resolver(false))
    alertResolvers.forEach(resolver => resolver())
    setConfirmResolvers(new Map())
    setAlertResolvers(new Map())
  }, [confirmResolvers, alertResolvers])

  const handleConfirm = useCallback((id: string, onConfirm?: () => void | Promise<void>) => {
    const resolver = confirmResolvers.get(id)
    if (resolver) {
      const executeConfirm = async () => {
        if (onConfirm) {
          try {
            await onConfirm()
          } catch (error) {
            console.error('Error in confirm callback:', error)
          }
        }
        resolver(true)
        closeModal(id)
      }
      executeConfirm()
    }
  }, [confirmResolvers, closeModal])

  const value: ModalContextValue = {
    showModal,
    showConfirm,
    showAlert,
    closeModal,
    closeAllModals,
    activeModals: modals
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
      
      {/* Render active modals */}
      {modals.map((modal) => {
        const key = modal.id || 'modal'
        
        if (modal.type === 'confirm') {
          const props = modal.props as ConfirmModalProps
          return (
            <ConfirmationDialog
              key={key}
              {...props}
              onConfirm={() => handleConfirm(key, props.onConfirm)}
            />
          )
        }
        
        if (modal.type === 'alert') {
          const props = modal.props as AlertModalProps
          return (
            <AlertModal
              key={key}
              {...props}
            />
          )
        }
        
        // Custom modal
        const props = modal.props as BaseModalProps
        return (
          <Modal key={key} {...props}>
            {modal.content}
          </Modal>
        )
      })}
    </ModalContext.Provider>
  )
}

// Hook to use modal context
/* eslint-disable react-refresh/only-export-components */
export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

// Convenience hooks
export function useConfirmModal() {
  const { showConfirm } = useModal()
  return showConfirm
}

export function useAlertModal() {
  const { showAlert } = useModal()
  return showAlert
}

export function useCustomModal() {
  const { showModal, closeModal } = useModal()
  return { showModal, closeModal }
}
/* eslint-enable react-refresh/only-export-components */
