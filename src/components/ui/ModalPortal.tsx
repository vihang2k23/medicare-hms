import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ModalPortal defines the Modal Portal UI surface and its primary interaction flow.
/** Mount modal overlay on document.body so fixed positioning is viewport-true (not clipped by main scroll / transforms). */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
