import { Link, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelRightClose, ShieldAlert } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ROLE_CONFIG } from '../config/roles'
import { getNavIcon } from '../config/navIcons'
import type { SidebarAccent } from '../config/roles'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { toggleSidebar } from '../features/ui/uiSlice'

const ACCENT: Record<
  SidebarAccent,
  { activeBg: string; activeBorder: string; hoverBg: string; iconBg: string }
> = {
  blue: {
    activeBg: 'bg-sky-50 dark:bg-sky-500/10',
    activeBorder: 'border-sky-500 text-sky-600 dark:text-sky-400',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400',
  },
  green: {
    activeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    activeBorder: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    activeBg: 'bg-violet-50 dark:bg-violet-500/10',
    activeBorder: 'border-violet-500 text-violet-600 dark:text-violet-400',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
  },
  orange: {
    activeBg: 'bg-orange-50 dark:bg-orange-500/10',
    activeBorder: 'border-orange-500 text-orange-600 dark:text-orange-400',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
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
  const styles = ACCENT[config.accent]

  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-0'} min-h-screen overflow-hidden transition-[width] duration-200 ease-out flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800`}
    >
      <div className="w-64 min-h-screen flex flex-col">
        {/* Nav header - Vuexy style: logo area + collapse */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              M
            </div>
            <span className="font-semibold text-slate-800 dark:text-white truncate">Menu</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            ) : (
              <PanelRightClose className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        {/* Vertical menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Navigation
          </p>
          <ul className="space-y-0.5">
            {links.map(({ path, label }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
              const Icon = getNavIcon(path)
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 border-transparent transition-colors ${styles.hoverBg} ${
                      isActive
                        ? `${styles.activeBg} ${styles.activeBorder} border-l-2`
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? styles.iconBg : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-medium text-sm truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="px-3 mt-6 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Other
          </p>
          <Link
            to="/access-denied"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-sm font-medium transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" aria-hidden />
            </span>
            Access Denied
          </Link>
        </nav>
      </div>
    </aside>
  )
}
