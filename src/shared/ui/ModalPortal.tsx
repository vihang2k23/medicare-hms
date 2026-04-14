import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Mount modal overlay on document.body so fixed positioning is viewport-true (not clipped by main scroll / transforms). */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
