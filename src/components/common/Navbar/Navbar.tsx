import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { BedDouble, ChevronDown, Keyboard, LogOut, Menu, Moon, PanelLeftClose, RotateCcw, Sun, X } from 'lucide-react'
import { logout, login } from '../../../store/slices/authSlice'
import type { AuthUser, NavbarProps, LetterShortcutKey, RoleShortcutRow, DemoLoginEntry } from '../../../types'
import { useAuth } from '../../../hooks/useAuth'
import NotificationBell from '../../../domains/alerts/NotificationBell'
import { setTheme, toggleSidebar } from '../../../store/slices/uiSlice'
import { setBedSimulationRunning } from '../../../store/slices/bedSlice'
import type { RootState } from '../../../store'
import { notify } from '../../../utils/helpers'
import { MediCareLogo, MediCareWordmark } from './brand'
import { ALL_DEMO_LOGIN_ENTRIES, demoEntryToAuthUser } from '../../../config/demoAccounts'
import { getDefaultDashboard } from '../../../config/roles'

// Navbar defines the Navbar UI surface and its primary interaction flow.
/** Human-readable role for the menu (neutral copy, no loud badge colors). */
const ROLE_DISPLAY: Record<AuthUser['role'], string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
}


/** Letter shortcuts available per role (must match `runShortcut` / global key listener). */
function roleShortcutRows(role: AuthUser['role'] | null | undefined): RoleShortcutRow[] {
  if (!role) return []
  switch (role) {
    case 'admin':
      return [
        { key: 'D', label: 'Dashboard', to: '/admin/dashboard' },
        { key: 'P', label: 'Patients', to: '/patients' },
        { key: 'A', label: 'Appointments', to: '/appointments' },
        { key: 'T', label: 'Doctors', to: '/directory' },
        { key: 'R', label: 'Reports', to: '/reports' },
        { key: 'B', label: 'Beds', to: '/beds' },
      ]
    case 'doctor':
      return [
        { key: 'M', label: 'My Patients', to: '/doctor/my-patients' },
        { key: 'A', label: 'Appointments', to: '/doctor/appointments' },
        { key: 'V', label: 'Vitals Entry', to: '/vitals-entry' },
        { key: 'P', label: 'Prescriptions', to: '/doctor/prescriptions' },
        { key: 'D', label: 'Dashboard', to: '/doctor/dashboard' },
      ]
    case 'receptionist':
      return [
        { key: 'D', label: 'Dashboard', to: '/receptionist/dashboard' },
        { key: 'A', label: 'Appointments', to: '/appointments' },
        { key: 'P', label: 'Patients', to: '/patients' },
        { key: 'B', label: 'Beds', to: '/beds' },
      ]
    case 'nurse':
      return [
        { key: 'D', label: 'Dashboard', to: '/nurse/dashboard' },
        { key: 'V', label: 'Vitals Entry', to: '/vitals-entry' },
        { key: 'B', label: 'Beds', to: '/beds' },
      ]
    default:
      return []
  }
}

/** Reduced-motion-friendly fade/slide transition. */
const TRANSITION = {
  base: 'transition-all duration-200 ease-out',
  open: 'opacity-100 translate-y-0',
  closed: 'opacity-0 -translate-y-1 pointer-events-none',
}

const itemBtnBase =
  'w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors'
const itemBtnIdle = 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
const itemBtnDanger = 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/** Small badge to show current role in the menu. */
function RoleBadge({ role }: { role: AuthUser['role'] }) {
  const map: Record<AuthUser['role'], string> = {
    admin: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    doctor: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    receptionist: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    nurse: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  }
  return (
    <span
      className={classNames(
        'text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-wide',
        map[role]
      )}
    >
      {ROLE_DISPLAY[role]}
    </span>
  )
}

// Navbar renders the navbar UI.
export default function Navbar({
  onCloseSidebar,
}: NavbarProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoLoadingId, setDemoLoadingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const helpBtnRef = useRef<HTMLButtonElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const demoBtnRef = useRef<HTMLButtonElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)

  const theme = useSelector((s: RootState) => s.ui.theme)
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen)
  const bedSimRunning = useSelector((s: RootState) => s.beds.simulationRunning)
  const isDark = theme === 'dark'

  const shortcuts = useMemo(() => roleShortcutRows(user?.role), [user?.role])

  // Close menus on route change
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMenuOpen(false)
    setHelpOpen(false)
    setDemoOpen(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [navigate])

  // Close menus on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(t) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(t)
      ) {
        setMenuOpen(false)
      }
      if (
        helpOpen &&
        helpRef.current &&
        !helpRef.current.contains(t) &&
        helpBtnRef.current &&
        !helpBtnRef.current.contains(t)
      ) {
        setHelpOpen(false)
      }
      if (
        demoOpen &&
        demoRef.current &&
        !demoRef.current.contains(t) &&
        demoBtnRef.current &&
        !demoBtnRef.current.contains(t)
      ) {
        setDemoOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen, helpOpen, demoOpen])

  // Close menus on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setHelpOpen(false)
        setDemoOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Run a keyboard shortcut
  const runShortcut = useCallback(
    (key: LetterShortcutKey) => {
      if (!user) return
      const target = roleShortcutRows(user.role).find((r) => r.key === key)?.to
      if (!target) return
      navigate(target)
      setHelpOpen(false)
    },
    [navigate, user]
  )

  // Global key listener (Ctrl/Cmd + letter)
  useEffect(() => {
    if (!user) return
    function onDocKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toUpperCase() as LetterShortcutKey
      const available = roleShortcutRows(user.role).map((r) => r.key)
      if (available.includes(key)) {
        e.preventDefault()
        runShortcut(key)
      }
    }
    document.addEventListener('keydown', onDocKey)
    return () => document.removeEventListener('keydown', onDocKey)
  }, [runShortcut, user])

  const handleLogout = () => {
    dispatch(logout())
    setMenuOpen(false)
    navigate('/login')
  }

  const handleDemoLogin = async (entry: DemoLoginEntry) => {
    setDemoLoadingId(entry.id)
    try {
      const authUser = demoEntryToAuthUser(entry)
      await dispatch(login(authUser))
      notify.success(`Logged in as ${entry.label}`)
      setDemoOpen(false)
      const defaultDashboard = getDefaultDashboard(authUser.role)
      navigate(defaultDashboard)
    } finally {
      setDemoLoadingId(null)
    }
  }

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    dispatch(setTheme(next))
  }

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar())
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/70 backdrop-blur-md">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Sidebar toggle + Logo + optional close button */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <Link to={user ? getDefaultDashboard(user.role) : '/login'} className="flex items-center gap-2 min-w-0">
            <MediCareLogo size="md" />
            <div className="hidden sm:block">
              <MediCareWordmark size="compact" />
            </div>
          </Link>

          {onCloseSidebar && (
            <button
              type="button"
              onClick={onCloseSidebar}
              className="ml-1 p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>

        {/* Right: Notifications + Theme + Help + Menu */}
        <div className="flex items-center gap-2">
          {/* Bed Simulation Toggle (admin only) */}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => dispatch(setBedSimulationRunning(!bedSimRunning))}
              className={classNames(
                'p-2 rounded-xl transition-colors relative',
                bedSimRunning
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              )}
              aria-label={bedSimRunning ? 'Bed simulation running' : 'Bed simulation paused'}
              title={bedSimRunning ? 'Bed simulation running (click to pause)' : 'Bed simulation paused (click to run)'}
            >
              <BedDouble className="h-5 w-5" aria-hidden />
              {bedSimRunning && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          )}

          <NotificationBell />

          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
          </button>

          {/* Keyboard shortcuts (help) popover */}
          <div className="relative">
            <button
              ref={helpBtnRef}
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className={classNames(
                'p-2 rounded-xl transition-colors',
                helpOpen
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              )}
              aria-haspopup="true"
              aria-expanded={helpOpen}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-5 w-5" aria-hidden />
            </button>

            <div
              ref={helpRef}
              className={classNames(
                'absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-xl z-50',
                TRANSITION.base,
                helpOpen ? TRANSITION.open : TRANSITION.closed
              )}
              role="dialog"
              aria-label="Keyboard shortcuts"
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Shortcuts</p>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="px-4 py-3">
                {shortcuts.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">No shortcuts available.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ctrl/Cmd + letter</p>
                    <div className="grid grid-cols-2 gap-2">
                      {shortcuts.map((row) => (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => runShortcut(row.key)}
                          className="flex items-center gap-2 text-left px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                            {row.key}
                          </kbd>
                          <span className="text-sm text-slate-700 dark:text-slate-200">{row.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={classNames(
                'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border transition-colors',
                menuOpen
                  ? 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800'
              )}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
            >
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                  {user?.name ?? 'Guest'}
                </p>
                {user && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>}
              </div>
              <ChevronDown className={classNames('h-4 w-4 text-slate-500 transition-transform', menuOpen ? 'rotate-180' : '')} aria-hidden />
            </button>

            <div
              ref={menuRef}
              className={classNames(
                'absolute right-0 mt-2 w-64 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-xl z-50',
                TRANSITION.base,
                menuOpen ? TRANSITION.open : TRANSITION.closed
              )}
              role="menu"
            >
              <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user?.name ?? 'Guest'}
                  </p>
                  {user && <RoleBadge role={user.role} />}
                </div>
                {user && <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>}
              </div>

              <div className="p-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Demo Accounts
                </div>

                {ALL_DEMO_LOGIN_ENTRIES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleDemoLogin(entry)}
                    disabled={demoLoadingId === entry.id}
                    className={classNames(
                      itemBtnBase,
                      itemBtnIdle,
                      'w-full text-left'
                    )}
                  >
                    {demoLoadingId === entry.id ? (
                      <RotateCcw className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
                    )}
                    <span className="flex-1">{entry.label}</span>
                  </button>
                ))}

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={classNames(itemBtnBase, itemBtnDanger, 'w-full')}
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
