import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_CONFIG } from '../../config/roles'
import { ROUTES_CONFIG } from '../../router/AppRoutes'
import type { SidebarAccent } from '../../config/roles'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { setSidebarOpen } from '../../store/slices/uiSlice'
import MediCareLogo from './brand/MediCareLogo'
import { LUCIDE_STROKE_CHROME, LUCIDE_STROKE_SIDEBAR_ACTIVE } from '../../utils/helpers'
import {
  Activity,
  BarChart3,
  BedDouble,
  Calendar,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Stethoscope,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react'

// Sidebar defines the Sidebar UI surface and its primary interaction flow.
const ACCENT: Record<
  SidebarAccent,
  { activeBg: string; activeBorder: string; hoverBg: string; iconBg: string }
> = {
  blue: {
    activeBg: 'bg-sky-50 dark:bg-sky-500/10',
    activeBorder: 'border-sky-500 text-sky-800 dark:text-sky-100',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-sky-100 dark:bg-sky-500/25 text-sky-900 dark:text-sky-100',
  },
  green: {
    activeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    activeBorder: 'border-emerald-500 text-emerald-800 dark:text-emerald-100',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-100',
  },
  purple: {
    activeBg: 'bg-violet-50 dark:bg-violet-500/10',
    activeBorder: 'border-violet-500 text-violet-800 dark:text-violet-100',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-violet-100 dark:bg-violet-500/25 text-violet-900 dark:text-violet-100',
  },
  orange: {
    activeBg: 'bg-orange-50 dark:bg-orange-500/10',
    activeBorder: 'border-orange-500 text-orange-800 dark:text-orange-100',
    hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/80',
    iconBg: 'bg-orange-100 dark:bg-orange-500/25 text-orange-900 dark:text-orange-100',
  },
}

// Sidebar renders the sidebar UI.
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
        'h-[calc(100dvh-4rem)] lg:h-full lg:max-h-full',
        'w-[min(18rem,calc(100vw-1.25rem))] sm:w-64 max-w-[85vw]',
        'transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarOpen ? 'lg:w-64' : 'lg:w-0 lg:border-r-0 lg:pointer-events-none',
      ].join(' ')}
    >
      <div className="flex h-full min-h-0 w-full min-w-[16rem] sm:w-64 flex-col">
     

        {/* Vertical menu */}
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <p className="px-3 mb-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">
            Main
          </p>
          <ul className="space-y-1">
            {links.map(({ path, label }) => {
              const isActive = path === activeSidebarPath
              const roleRoutes = ROUTES_CONFIG[user?.role as keyof typeof ROUTES_CONFIG]
              const route = roleRoutes?.routes.find(r => r.path === path) || roleRoutes?.dashboard.path === path ? roleRoutes.dashboard : null
              const Icon = route?.icon || (() => {
                // Fallback to default icon based on path
                if (path.includes('patients')) return Users
                if (path.includes('beds')) return BedDouble
                if (path.includes('appointments') || path.includes('schedule')) return Calendar
                if (path.includes('prescriptions')) return FileText
                if (path.includes('doctors')) return Stethoscope
                if (path.includes('reports')) return BarChart3
                if (path.includes('queue')) return ListOrdered
                if (path.includes('registration')) return UserPlus
                if (path.includes('vitals')) return Activity
                return LayoutDashboard
              })()
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={closeOnMobileNav}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-800 transition-all duration-200 touch-manipulation ${
                      isActive
                        ? `${styles.activeBg} ${styles.activeBorder} shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/40 font-semibold dark:text-slate-100`
                        : `dark:text-slate-200 ${styles.hoverBg} hover:text-slate-950 dark:hover:text-white`
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? styles.iconBg
                          : 'bg-slate-200/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 ring-1 ring-slate-300/70 dark:ring-slate-600/50'
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${isActive ? LUCIDE_STROKE_SIDEBAR_ACTIVE[config.accent] : LUCIDE_STROKE_CHROME}`}
                        strokeWidth={2.5}
                        aria-hidden
                      />
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
