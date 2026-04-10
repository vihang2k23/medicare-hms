import { useEffect } from 'react'

let lockCount = 0

type Stored = {
  htmlOverflow: string
  bodyOverflow: string
  htmlOverscroll: string
  bodyOverscroll: string
  mainOverflow: string
}

let stored: Stored | null = null

function applyLock() {
  const html = document.documentElement
  const body = document.body
  const main = document.querySelector('main')

  stored = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverscroll: body.style.overscrollBehavior,
    mainOverflow: main instanceof HTMLElement ? main.style.overflow : '',
  }

  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
  body.style.overscrollBehavior = 'none'
  if (main instanceof HTMLElement) {
    main.style.overflow = 'hidden'
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
