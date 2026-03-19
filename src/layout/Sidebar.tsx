import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SIDEBAR_LINKS } from '../config/roles'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { toggleSidebar } from '../features/ui/uiSlice'

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const dispatch = useDispatch()

  if (!user) return null
  const links = SIDEBAR_LINKS[user.role] ?? []

  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-0'} min-h-screen bg-gray-800 dark:bg-gray-900 text-white overflow-hidden transition-all duration-200 flex-shrink-0 border-r border-gray-700 dark:border-gray-800`}
    >
      <div className="w-64 min-h-screen p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-sm text-gray-300 dark:text-gray-400">Menu</span>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-1 rounded hover:bg-gray-700 dark:hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 ${location.pathname === path ? 'bg-gray-700 dark:bg-gray-800' : ''}`}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/access-denied"
            className="px-3 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm"
          >
            Access Denied
          </Link>
        </nav>
      </div>
    </aside>
  )
}
