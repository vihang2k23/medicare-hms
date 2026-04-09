import { Link, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelRightClose } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ROLE_CONFIG } from '../config/roles'
import { getNavIcon } from '../config/navIcons'
import type { SidebarAccent } from '../config/roles'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { setSidebarOpen, toggleSidebar } from '../features/ui/uiSlice'
import MediCareLogo from '../components/brand/MediCareLogo'

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

  /** Longest matching path wins so `/admin` does not stay active on `/admin/patients`. */
  const activeSidebarPath = (() => {
    let best: string | null = null
    let bestLen = -1
    for (const { path } of links) {
      const exact = location.pathname === path
      const nested = location.pathname.startsWith(`${path}/`)
      if (exact || nested) {
        if (path.length > bestLen) {
          bestLen = path.length
          best = path
        }
      }
    }
    return best
  })()

  const closeOnMobileNav = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      dispatch(setSidebarOpen(false))
    }
  }

  return (
    <aside
      className={[
        'flex-shrink-0 bg-gradient-to-b from-white/95 via-white/90 to-slate-50/90 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-950/95 backdrop-blur-xl border-slate-200/70 dark:border-slate-800/80 border-r',
        'fixed z-[45] shadow-2xl shadow-slate-900/15 dark:shadow-black/50 lg:shadow-none lg:relative lg:z-auto',
        'top-16 lg:top-auto left-0',
        'h-[calc(100dvh-4rem)] lg:h-auto lg:min-h-[calc(100dvh-4rem)]',
        'w-[min(18rem,calc(100vw-1.25rem))] sm:w-64 max-w-[85vw]',
        'transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarOpen ? 'lg:w-64' : 'lg:w-0 lg:border-r-0 lg:pointer-events-none',
      ].join(' ')}
    >
      <div className="w-full min-w-[16rem] sm:w-64 min-h-full flex flex-col">
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/80 shrink-0 bg-gradient-to-r from-sky-500/[0.06] via-transparent to-violet-500/[0.05] dark:from-sky-500/10 dark:to-violet-500/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-[9px] shadow-md shadow-sky-500/25 ring-1 ring-slate-200/50 dark:ring-slate-600/50">
              <MediCareLogo size="sm" title={false} />
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white text-sm truncate tracking-tight block leading-tight">
                Navigation
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate block">
                MediCare HMS
              </span>
            </div>
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
              const isActive = path === activeSidebarPath
              const Icon = getNavIcon(path)
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={closeOnMobileNav}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 touch-manipulation ${
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
        </nav>
      </div>
    </aside>
  )
}
