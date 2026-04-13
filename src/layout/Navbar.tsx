import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Moon, PanelLeftClose, Sun } from 'lucide-react'
import { logout, login } from '../features/auth/authSlice'
import type { AuthUser } from '../features/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import { useAuth } from '../hooks/useAuth'
import NotificationBell from '../features/alerts/NotificationBell'
import { setTheme, toggleSidebar } from '../features/ui/uiSlice'
import type { RootState } from '../app/store'
import { notify } from '../lib/notify'
import MediCareLogo, { MediCareWordmark } from '../components/brand/MediCareLogo'
import { ALL_DEMO_LOGIN_ENTRIES, demoEntryToAuthUser, type DemoLoginEntry } from '../config/demoAccounts'

/** Human-readable role for the menu (neutral copy, no loud badge colors). */
const ROLE_DISPLAY: Record<AuthUser['role'], string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
}

export default function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const theme = useSelector((state: RootState) => state.ui.theme)
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchAccount = (u: DemoLoginEntry) => {
    dispatch(login(demoEntryToAuthUser(u)))
    setDropdownOpen(false)
    notify.success(`Switched to ${u.name}`)
    setTimeout(() => navigate(getDefaultDashboard(u.role)), 0)
  }

  return (
    <header className="sticky top-0 z-50 h-16 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 lg:px-8 bg-white/80 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_0_0_rgb(15_23_42_/_0.06)] dark:shadow-[0_1px_0_0_rgb(0_0_0_/_0.35)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top,0px)]">
      {/* Left: menu toggler + brand */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-white dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        )}
        <Link
          to="/"
          className="flex items-center gap-3 group rounded-2xl py-1.5 pl-1 pr-2 -ml-1 hover:bg-slate-100/90 dark:hover:bg-slate-800/60 transition-colors duration-200"
        >
          <span className="relative shrink-0 rounded-[11px] shadow-md shadow-sky-500/30 ring-1 ring-white/40 dark:ring-slate-600/50 group-hover:shadow-lg group-hover:shadow-sky-500/40 transition-shadow duration-300">
            <MediCareLogo size="md" title={false} />
          </span>
          <MediCareWordmark className="hidden sm:flex" size="compact" subtitle="Hospital Management" />
        </Link>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-white dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>

        {isAuthenticated ? (
          <>
            {user?.role === 'admin' && <NotificationBell onOpen={() => setDropdownOpen(false)} />}
            <div className="relative ml-1 sm:ml-2" ref={ref}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                className="group flex items-center gap-2.5 sm:gap-3 pl-1.5 sm:pl-2 pr-1.5 sm:pr-2 py-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/90 hover:bg-slate-50/95 dark:hover:bg-slate-800/95 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm shadow-slate-200/30 dark:shadow-none transition-all duration-200 min-w-0 max-w-[min(100%,17rem)]"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/90 text-sm font-semibold text-slate-700 dark:text-white ring-1 ring-slate-200/90 dark:ring-slate-700/80"
                  aria-hidden
                >
                  {user?.name?.charAt(0) ?? '?'}
                </div>
                <div className="hidden min-w-0 flex-1 flex-col items-stretch text-left sm:flex">
                  <span className="truncate text-[13px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                    {user?.name}
                  </span>
                  <span className="mt-1 text-[11px] font-medium leading-none text-slate-500 dark:text-white">
                    {ROLE_DISPLAY[user?.role ?? 'admin']}
                  </span>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors dark:bg-slate-800/70 dark:text-white group-hover:bg-slate-100 dark:group-hover:bg-slate-700/80">
                  <ChevronDown
                    strokeWidth={2.5}
                    className={`h-4 w-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </span>
              </button>

              {dropdownOpen && (
                <div
                  className="no-print-appt absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),18rem)] rounded-2xl border border-slate-200/90 bg-white/98 p-1 shadow-2xl shadow-slate-300/35 ring-1 ring-slate-200/60 backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:shadow-slate-950/30 dark:ring-slate-700/60 z-50"
                  role="menu"
                >
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50/90 px-3 py-3 dark:bg-slate-800/50">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-base font-semibold text-slate-700 ring-1 ring-slate-200/90 dark:bg-slate-800 dark:text-white dark:ring-slate-600/80">
                      {user?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-white">
                        {ROLE_DISPLAY[user?.role ?? 'admin']}
                      </p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-slate-200/80 dark:bg-slate-700/80" />
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white">
                    Switch account
                  </p>
                  <div className="max-h-52 overflow-auto px-0.5 pb-1">
                    {ALL_DEMO_LOGIN_ENTRIES.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleSwitchAccount(u)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-white">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-white">{ROLE_DISPLAY[u.role]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-200/80 p-1.5 dark:border-slate-700/80">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        dispatch(logout())
                        setDropdownOpen(false)
                        notify.success('Signed out')
                        navigate('/login')
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-white dark:hover:bg-red-950/40"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : <></>}
      </div>
    </header>
  )
}
