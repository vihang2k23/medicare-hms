import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets window scroll when the route changes (e.g. login and other full-page routes). */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
