import { useEffect } from 'react'

let lockCount = 0

type Stored = {
  htmlOverflow: string
  bodyOverflow: string
  htmlOverscroll: string
  bodyOverscroll: string
  mainOverflow: string
  mainPaddingRight: string
}

let stored: Stored | null = null

function applyLock() {
  const html = document.documentElement
  const body = document.body
  const main = document.querySelector('main')

  /** Measure before hiding overflow — scrollbar width disappears after `overflow: hidden`. */
  let mainScrollbar = 0
  if (main instanceof HTMLElement) {
    mainScrollbar = main.offsetWidth - main.clientWidth
  }

  stored = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverscroll: body.style.overscrollBehavior,
    mainOverflow: main instanceof HTMLElement ? main.style.overflow : '',
    mainPaddingRight: main instanceof HTMLElement ? main.style.paddingRight : '',
  }

  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
  body.style.overscrollBehavior = 'none'
  if (main instanceof HTMLElement) {
    main.style.overflow = 'hidden'
    // Keep layout width stable when the main column scrollbar disappears (avoids horizontal jump).
    if (mainScrollbar > 0) {
      const basePr = parseFloat(getComputedStyle(main).paddingRight) || 0
      main.style.paddingRight = `${basePr + mainScrollbar}px`
    }
  }
}

function releaseLock() {
  if (!stored) return
  const html = document.documentElement
  const body = document.body
  const main = document.querySelector('main')

  html.style.overflow = stored.htmlOverflow
  body.style.overflow = stored.bodyOverflow
  html.style.overscrollBehavior = stored.htmlOverscroll
  body.style.overscrollBehavior = stored.bodyOverscroll
  if (main instanceof HTMLElement) {
    main.style.overflow = stored.mainOverflow
    main.style.paddingRight = stored.mainPaddingRight
  }
  stored = null
}

/**
 * Locks document + app main scroll while a modal is open so the page behind does not move
 * and wheel/touch scrolling targets the modal body instead of the layout.
 */
export function useModalScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lockCount += 1
    if (lockCount === 1) {
      applyLock()
    }
    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        releaseLock()
      }
    }
  }, [active])
}
