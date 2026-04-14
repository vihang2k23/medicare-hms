import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

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
