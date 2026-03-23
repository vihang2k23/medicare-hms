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
  admin: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  doctor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  receptionist: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  nurse: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
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
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:shadow-none">
      {/* Left: menu toggler + brand */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shrink-0">
            <span className="font-bold text-sm">M</span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-white text-lg tracking-tight hidden sm:inline">
            MediCare
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium hidden md:inline">HMS</span>
        </Link>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
          className="p-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
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
                className="flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-0"
              >
                <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sm font-semibold text-sky-600 dark:text-sky-400 shrink-0">
                  {user?.name?.charAt(0) ?? '?'}
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{user?.name}</p>
                  <p className={`text-xs px-2 py-0.5 rounded-md capitalize font-medium ${ROLE_BADGE[user?.role ?? 'admin']}`}>
                    {user?.role}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden z-50">
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
            className="ml-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  )
}
