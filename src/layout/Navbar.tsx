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

const DEMO_USERS: Array<{ role: AuthUser['role']; name: string; id: string; avatar: string }> = [
  { role: 'admin', name: 'Admin User', id: 'ADM001', avatar: '' },
  { role: 'doctor', name: 'Dr. Vihang', id: 'DOC001', avatar: '' },
  { role: 'receptionist', name: 'Riya Patel', id: 'REC001', avatar: '' },
  { role: 'nurse', name: 'Meena Patel', id: 'NUR001', avatar: '' },
]

function toAuthUser(u: (typeof DEMO_USERS)[0]): AuthUser {
  return { id: u.id, role: u.role, name: u.name, avatar: u.avatar }
}

const ROLE_BADGE: Record<AuthUser['role'], string> = {
  admin: 'bg-sky-100/90 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 ring-1 ring-sky-200/60 dark:ring-sky-500/25',
  doctor: 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-1 ring-emerald-200/60 dark:ring-emerald-500/25',
  receptionist: 'bg-violet-100/90 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 ring-1 ring-violet-200/60 dark:ring-violet-500/25',
  nurse: 'bg-orange-100/90 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 ring-1 ring-orange-200/60 dark:ring-orange-500/25',
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

  const handleSwitchAccount = (u: (typeof DEMO_USERS)[0]) => {
    dispatch(login(toAuthUser(u)))
    setDropdownOpen(false)
    notify.success(`Switched to ${u.name}`)
    setTimeout(() => navigate(getDefaultDashboard(u.role)), 0)
  }

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-8 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/80 shadow-[0_1px_0_0_rgb(15_23_42_/_0.04)] dark:shadow-none z-20">
      {/* Left: menu toggler + brand */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        )}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/30 ring-1 ring-white/25 group-hover:shadow-lg group-hover:shadow-sky-500/35 transition-shadow duration-300">
            <span className="font-bold text-sm tracking-tight">M</span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">MediCare</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600/90 dark:text-sky-400/90 hidden md:block">
              Hospital MS
            </span>
          </div>
        </Link>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>

        {isAuthenticated ? (
          <>
            {user?.role === 'admin' && <NotificationBell />}
            <div className="relative ml-2" ref={ref}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/90 backdrop-blur-sm shadow-sm transition-all duration-200 min-w-0"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-sky-200/80 dark:from-sky-900/60 dark:to-sky-800/40 flex items-center justify-center text-sm font-bold text-sky-700 dark:text-sky-300 shrink-0 ring-2 ring-white dark:ring-slate-800">
                  {user?.name?.charAt(0) ?? '?'}
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p
                    className={`text-[10px] mt-0.5 px-2 py-0.5 rounded-full capitalize font-semibold tracking-wide inline-block ${ROLE_BADGE[user?.role ?? 'admin']}`}
                  >
                    {user?.role}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-300/40 dark:shadow-black/50 overflow-hidden z-50 ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{user?.role}</p>
                  </div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Switch account</p>
                  <div className="py-1 max-h-48 overflow-auto">
                    {DEMO_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchAccount(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(logout())
                        setDropdownOpen(false)
                        notify.success('Signed out')
                        navigate('/login')
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="ml-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white shadow-lg shadow-sky-500/25 transition-all duration-200"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  )
}
