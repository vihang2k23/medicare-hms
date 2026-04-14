import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import type { RootState } from '../app/store'
import { setSidebarOpen } from '../features/ui/uiSlice'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const dispatch = useDispatch()
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen)
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      dispatch(setSidebarOpen(false))
    }
  }, [pathname, dispatch])

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden app-surface-gradient">
      <Navbar />
      <div className="flex min-h-0 flex-1 min-w-0 relative">
        {sidebarOpen && (
          <button
            type="button"
            className="no-print-appt lg:hidden fixed inset-0 top-16 z-40 bg-slate-950/50 backdrop-blur-[2px] motion-safe:transition-opacity"
            aria-label="Close navigation menu"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
        <Sidebar />
        <main className="min-h-0 flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 xl:px-10 xl:py-10 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <div className="mx-auto max-w-[1680px] w-full min-w-0 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
