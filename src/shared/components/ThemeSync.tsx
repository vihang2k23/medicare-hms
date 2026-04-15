import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

// ThemeSync defines the Theme Sync UI surface and its primary interaction flow.
// ThemeSync renders the theme sync UI.
export default function ThemeSync() {
  const theme = useSelector((state: RootState) => state.ui.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return null
}
