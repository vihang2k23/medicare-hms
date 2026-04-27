import { Fragment, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { BedDouble, ChevronDown, Keyboard, LogOut, Menu, Moon, PanelLeftClose, RotateCcw, Sun, X } from 'lucide-react'
import { logout, login } from '../../../store/slices/authSlice'
import type { AuthUser, NavbarProps, LetterShortcutKey, RoleShortcutRow, DemoLoginEntry } from '../../../types'
import { useAuth } from '../../../hooks/useAuth'
import NotificationBell from '../../../domains/alerts/NotificationBell'
import { setSidebarOpen, setTheme, toggleSidebar } from '../../../store/slices/uiSlice'
import { setBedSimulationRunning } from '../../../store/slices/bedSlice'
import type { RootState } from '../../../store'
import { notify, LUCIDE_STROKE_CHROME } from '../../../utils/helpers'
import { MediCareLogo, MediCareWordmark } from '../brand'
import { ALL_DEMO_LOGIN_ENTRIES, demoEntryToAuthUser } from '../../../config/demoAccounts'
import { APPOINTMENTS_STORAGE_KEY } from '../../../domains/appointments/appointmentsStorage'
import { PRESCRIPTIONS_STORAGE_KEY } from '../../../domains/prescriptions/prescriptionsStorage'
import ConfirmDialog from '../Dialog/ConfirmationDialog'
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
        { key: 'n', keysLabel: 'N', label: 'New patient', path: '/admin/patients/new' },
        { key: 'q', keysLabel: 'Q', label: 'OPD queue', path: '/admin/opd-queue' },
        { key: 'b', keysLabel: 'B', label: 'Bed management', path: '/admin/beds' },
      ]
    case 'receptionist':
      return [
        { key: 'n', keysLabel: 'N', label: 'Patient registration', path: '/receptionist/registration' },
        { key: 'q', keysLabel: 'Q', label: 'OPD queue', path: '/receptionist/queue' },
      ]
    case 'nurse':
      return [{ key: 'b', keysLabel: 'B', label: 'Bed management', path: '/nurse/beds' }]
    case 'doctor':
    default:
      return []
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}


// Navbar renders the navbar UI.
export default function Navbar({ showSidebarToggle = true }: NavbarProps) {
  const { user, isAuthenticated } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const theme = useSelector((state: RootState) => state.ui.theme)
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const bedSimulationRunning = useSelector((state: RootState) => state.beds.bedSimulationRunning)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [resetDemoOpen, setResetDemoOpen] = useState(false)
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
    setShortcutsOpen(false)
    notify.success(`Switched to ${u.name}`)
    setTimeout(() => navigate(getDefaultDashboard(u.role)), 0)
  }

  const runShortcut = useCallback(
    (key: LetterShortcutKey) => {
      const role = user?.role
      if (!role) return
      const row = roleShortcutRows(role).find((r) => r.key === key)
      if (!row) {
        notify.error('This shortcut is not available for your role.')
        return
      }
      setDropdownOpen(false)
      setShortcutsOpen(false)
      navigate(row.path)
    },
    [navigate, user?.role],
  )

  const letterShortcuts = useMemo(() => roleShortcutRows(user?.role), [user?.role])
  const hasLetterShortcuts = letterShortcuts.length > 0

  const executeResetDemoData = () => {
    if (user?.role !== 'admin') return
    try {
      localStorage.removeItem(APPOINTMENTS_STORAGE_KEY)
      localStorage.removeItem(PRESCRIPTIONS_STORAGE_KEY)
      notify.success('Demo data reset. Reloading…')
      setResetDemoOpen(false)
      setDropdownOpen(false)
      setTimeout(() => window.location.reload(), 250)
    } catch {
      notify.error('Could not reset demo cache in this browser.')
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        if (!hasLetterShortcuts) return
        e.preventDefault()
        setDropdownOpen(false)
        setShortcutsOpen((o) => !o)
        return
      }
      if (key === 'escape') {
        setShortcutsOpen(false)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || isEditableTarget(e.target)) return
      const letterKeys = new Set(letterShortcuts.map((r) => r.key))
      if (letterKeys.has(key as LetterShortcutKey)) {
        e.preventDefault()
        runShortcut(key as LetterShortcutKey)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasLetterShortcuts, isAuthenticated, letterShortcuts, runShortcut])

  return (
    <>
      <header className="sticky top-0 z-50 h-16 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 lg:px-8 bg-white/80 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_0_0_rgb(15_23_42_/_0.06)] dark:shadow-[0_1px_0_0_rgb(0_0_0_/_0.35)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top,0px)]">
      {/* Left: menu toggler + brand */}
      <div className="flex items-center gap-4">
        {isAuthenticated && showSidebarToggle && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2.5 rounded-xl text-slate-900 hover:text-slate-950 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className={`h-5 w-5 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
            ) : (
              <Menu className={`h-5 w-5 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
            )}
          </button>
        )}
        <Link
          to="/"
          className="flex items-center gap-3 group rounded-2xl py-1.5 pl-1 pr-2 -ml-1 hover:bg-slate-100/90 dark:hover:bg-slate-800/60 transition-colors duration-200"
        >
          <span className="relative shrink-0 rounded-[11px] shadow-md shadow-sky-500/30 ring-1 ring-white/40 dark:ring-slate-600/50 group-hover:shadow-lg group-hover:shadow-sky-500/40 transition-shadow duration-300">
            <MediCareLogo size="md" />
          </span>
          <MediCareWordmark className="hidden sm:flex" size="compact" />
        </Link>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
          className="p-2.5 rounded-xl text-slate-900 hover:text-slate-950 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className={`h-5 w-5 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
          ) : (
            <Moon className={`h-5 w-5 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
          )}
        </button>

        {isAuthenticated ? (
          <>
            {hasLetterShortcuts && (
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false)
                  setShortcutsOpen(true)
                }}
                className="p-2.5 rounded-xl text-slate-900 hover:text-slate-950 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
                aria-label="Open keyboard shortcuts"
                title="Keyboard shortcuts (Ctrl/Cmd + K)"
              >
                <Keyboard className={`h-5 w-5 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'nurse') && (
              <button
                type="button"
                onClick={() => dispatch(setBedSimulationRunning(!bedSimulationRunning))}
                className={`p-2.5 rounded-xl transition-all duration-200 touch-manipulation ${
                  bedSimulationRunning
                    ? 'text-amber-800 bg-amber-100/90 dark:text-amber-200 dark:bg-amber-950/50 ring-1 ring-amber-200/80 dark:ring-amber-800/60'
                    : 'text-slate-900 hover:text-slate-950 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80'
                }`}
                aria-pressed={bedSimulationRunning}
                aria-label={bedSimulationRunning ? 'Stop bed simulation' : 'Start bed simulation'}
                title="Toggle demo bed status simulation (~45s)"
              >
                <BedDouble
                  className={`h-5 w-5 ${bedSimulationRunning ? 'stroke-[#92400e] dark:stroke-amber-200' : LUCIDE_STROKE_CHROME}`}
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>
            )}
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
                  <span className="mt-1 text-[11px] font-medium leading-none text-slate-600 dark:text-slate-400">
                    {ROLE_DISPLAY[(user?.role ?? 'admin') as AuthUser['role']]}
                  </span>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition-colors dark:bg-slate-800/70 dark:text-white group-hover:bg-slate-200/90 dark:group-hover:bg-slate-700/80">
                  <ChevronDown
                    strokeWidth={2.5}
                    className={`h-4 w-4 ${LUCIDE_STROKE_CHROME} transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
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
                      <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {ROLE_DISPLAY[(user?.role ?? 'admin') as AuthUser['role']]}
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
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{ROLE_DISPLAY[u.role]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {(hasLetterShortcuts || user?.role === 'admin') && (
                    <>
                      <div className="my-1 h-px bg-slate-200/80 dark:bg-slate-700/80" />
                      <div className="px-1.5 pb-1.5 space-y-1">
                        {hasLetterShortcuts && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDropdownOpen(false)
                              setShortcutsOpen(true)
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
                          >
                            <Keyboard className={`h-4 w-4 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
                            Keyboard shortcuts (Ctrl/Cmd + K)
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDropdownOpen(false)
                              setResetDemoOpen(true)
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            <RotateCcw className={`h-4 w-4 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
                            Reset demo data (reseed)
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  <div className="border-t border-slate-200/80 p-1.5 dark:border-slate-700/80">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        dispatch(logout())
                        dispatch(setSidebarOpen(false))
                        setShortcutsOpen(false)
                        setDropdownOpen(false)
                        notify.success('Signed out')
                        navigate('/login', { replace: true })
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-white dark:hover:bg-red-950/40"
                    >
                      <LogOut className="h-4 w-4 stroke-red-600 dark:stroke-red-300" strokeWidth={2.5} aria-hidden />
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

      {shortcutsOpen && hasLetterShortcuts && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close shortcuts"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setShortcutsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-700/80">
              <h2 id="keyboard-shortcuts-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="p-2 rounded-lg text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Close shortcuts"
              >
                <X className={`h-4 w-4 ${LUCIDE_STROKE_CHROME}`} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p className="text-slate-600 dark:text-white">
                Use shortcuts from anywhere outside form fields.{' '}
                <span className="block mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  Role: {user?.role ? ROLE_DISPLAY[user.role as AuthUser['role']] : '—'}
                </span>
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-slate-700 dark:text-white">
                <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">Ctrl/Cmd + K</span>
                <span>Open this shortcuts panel</span>
                {letterShortcuts.map((row) => (
                  <Fragment key={row.key}>
                    <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                      {row.keysLabel}
                    </span>
                    <span>
                      {row.label}
                      <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {row.path}
                      </span>
                    </span>
                  </Fragment>
                ))}
              </div>
              <div className="pt-1 flex flex-wrap gap-2">
                {letterShortcuts.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => runShortcut(row.key)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white"
                  >
                    Go: {row.keysLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={resetDemoOpen}
        title="Reset demo data?"
        description="This clears local appointment and prescription cache in this browser and reloads seeded defaults."
        confirmLabel="Reset & reload"
        variant="danger"
        onCancel={() => setResetDemoOpen(false)}
        onConfirm={executeResetDemoData}
      />
    </>
  )
}
