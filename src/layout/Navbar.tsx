import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout, login } from '../features/auth/authSlice'
import type { AuthUser } from '../features/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import { useAuth } from '../hooks/useAuth'
import NotificationBell from '../features/alerts/NotificationBell'
import { setTheme, toggleSidebar } from '../features/ui/uiSlice'
import type { RootState } from '../app/store'

const DEMO_USERS: Array<{ role: AuthUser['role']; name: string; id: string; avatar: string }> = [
  { role: 'admin', name: 'Admin User', id: 'ADM001', avatar: '' },
  { role: 'doctor', name: 'Dr. Vihang', id: 'DOC001', avatar: '' },
  { role: 'receptionist', name: 'Riya Patel', id: 'REC001', avatar: '' },
  { role: 'nurse', name: 'Meena Patel', id: 'NUR001', avatar: '' },
]

function toAuthUser(u: (typeof DEMO_USERS)[0]): AuthUser {
  return { id: u.id, role: u.role, name: u.name, avatar: u.avatar }
}

export default function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const theme = useSelector((state: RootState) => state.ui.theme)
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchAccount = (u: (typeof DEMO_USERS)[0]) => {
    const path = getDefaultDashboard(u.role)
    dispatch(login(toAuthUser(u)))
    setDropdownOpen(false)
    // Defer navigation so ProtectedRoute sees updated user (fixes doctor/nurse redirect to Access Denied)
    setTimeout(() => navigate(path), 0)
  }

  return (
    <header className="h-14 bg-gray-900 dark:bg-gray-950 text-white flex items-center justify-between px-4 flex-shrink-0 border-b border-gray-800 dark:border-gray-900">
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            title={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? '◀' : '☰'}
          </button>
        )}
        <span className="font-semibold">Medicare HMS</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {isAuthenticated ? (
          <>
            {user?.role === 'admin' && <NotificationBell />}
            <div className="relative" ref={ref}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-2"
              >
                <span>{user?.name}</span>
                <span className="text-gray-400 text-sm">({user?.role})</span>
                <span className="text-xs">▼</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-gray-800 dark:bg-gray-900 rounded shadow-lg min-w-[180px] z-10 border border-gray-700 dark:border-gray-800">
                  <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 dark:border-gray-800">
                    Switch account
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchAccount(u)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 dark:hover:bg-gray-800 text-sm flex justify-between"
                    >
                      <span>{u.name}</span>
                      <span className="text-gray-400">{u.role}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-700 dark:border-gray-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(logout())
                        navigate('/login')
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 dark:hover:bg-gray-800 text-sm text-red-300"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/login" className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
