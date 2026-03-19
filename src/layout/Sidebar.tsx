import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROLE_CONFIG } from '../config/roles'
import type { SidebarAccent } from '../config/roles'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { toggleSidebar } from '../features/ui/uiSlice'

const ACCENT_STYLES: Record<
  SidebarAccent,
  { border: string; activeBg: string; activeBorder: string; hoverBg: string }
> = {
  blue: {
    border: 'border-l-blue-500',
    activeBg: 'bg-blue-500/20 dark:bg-blue-500/20',
    activeBorder: 'border-l-blue-400',
    hoverBg: 'hover:bg-blue-500/10 dark:hover:bg-blue-500/10',
  },
  green: {
    border: 'border-l-emerald-500',
    activeBg: 'bg-emerald-500/20 dark:bg-emerald-500/20',
    activeBorder: 'border-l-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10',
  },
  purple: {
    border: 'border-l-violet-500',
    activeBg: 'bg-violet-500/20 dark:bg-violet-500/20',
    activeBorder: 'border-l-violet-400',
    hoverBg: 'hover:bg-violet-500/10 dark:hover:bg-violet-500/10',
  },
  orange: {
    border: 'border-l-orange-500',
    activeBg: 'bg-orange-500/20 dark:bg-orange-500/20',
    activeBorder: 'border-l-orange-400',
    hoverBg: 'hover:bg-orange-500/10 dark:hover:bg-orange-500/10',
  },
}

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const dispatch = useDispatch()

  if (!user) return null

  const config = ROLE_CONFIG[user.role]
  const links = config.sidebarLinks
  const accent = ACCENT_STYLES[config.accent]

  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-0'} min-h-screen bg-gray-800 dark:bg-gray-900 text-white overflow-hidden transition-all duration-200 flex-shrink-0 border-r border-gray-700 dark:border-gray-800 border-l-4 ${accent.border}`}
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
          {links.map(({ path, label }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
            return (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded border-l-2 border-transparent ${accent.hoverBg} ${
                  isActive ? `${accent.activeBg} ${accent.activeBorder}` : 'border-l-transparent'
                }`}
              >
                {label}
              </Link>
            )
          })}
          <Link
            to="/access-denied"
            className="px-3 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm mt-2"
          >
            Access Denied
          </Link>
        </nav>
      </div>
    </aside>
  )
}
