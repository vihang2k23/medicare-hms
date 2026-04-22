/**
 * Modal overlay styling classes
 */

/** Fixed root: scrollable so tall modals / small viewports can move; overscroll stays in overlay. */
export function modalFixedRoot(zClass: string) {
  return `fixed inset-0 ${zClass} overflow-y-auto overscroll-y-contain`
}

/**
 * At least one dynamic viewport tall so flex centering is true vertical center (not stuck to bottom).
 * Use with ModalPortal -> body for reliable placement under app layout scroll/transform.
 */
export const modalFixedInner =
  'relative box-border flex min-h-[100dvh] w-full max-w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-12'

/** Full-bleed dim layer behind the panel (inside scrollable column). */
export const modalBackdropDim = 'absolute inset-0 min-h-full min-w-full bg-slate-950/50 backdrop-blur-sm'
