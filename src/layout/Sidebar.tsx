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
      className={`${sidebarOpen ? 'w-64' : 'w-0'} min-h-screen overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-800/80`}
    >
      <div className="w-64 min-h-screen flex flex-col">
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md shadow-sky-500/20">
              M
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm truncate tracking-tight">Navigation</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 shrink-0"
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
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Main
          </p>
          <ul className="space-y-1">
            {links.map(({ path, label }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
              const Icon = getNavIcon(path)
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? `${styles.activeBg} ${styles.activeBorder} shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/40 font-semibold`
                        : `text-slate-600 dark:text-slate-400 ${styles.hoverBg} hover:text-slate-900 dark:hover:text-slate-100`
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? styles.iconBg : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="text-sm truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="px-3 mt-8 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            System
          </p>
          <Link
            to="/access-denied"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-sm font-medium transition-all duration-200"
          >
            <span className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-[18px] w-[18px]" aria-hidden />
            </span>
            Access Denied
          </Link>
        </nav>
      </div>
    </aside>
  )
}
