/** Fixed root: scrollable so tall modals / small viewports can move; overscroll stays in overlay. */
export function modalFixedRoot(zClass: string) {
  return `fixed inset-0 ${zClass} overflow-y-auto overscroll-y-contain`
}

/** Centers dialog vertically when it fits; stretches to at least viewport height for scroll. */
export const modalFixedInner =
  'relative flex min-h-full w-full items-center justify-center p-4 py-10 sm:p-6 sm:py-12'

/** Full-bleed dim layer behind the panel (inside scrollable column). */
export const modalBackdropDim = 'absolute inset-0 min-h-full w-full bg-slate-950/50 backdrop-blur-sm'

export const modalBackdropDimStrong =
  'absolute inset-0 min-h-full w-full bg-slate-950/60 backdrop-blur-[2px]'
