import { configureStore, type Middleware } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import { AUTH_STORAGE_KEY } from '../features/auth/authConstants'
import type { AuthUser } from '../features/auth/authSlice'
import queueReducer from '../features/queue/queueSlice'
import bedReducer from '../features/beds/bedSlice'
import alertReducer from '../features/alerts/alertSlice'
import uiReducer from '../features/ui/uiSlice'
import { THEME_STORAGE_KEY } from '../features/ui/themeConstants'
import type { Theme } from '../features/ui/uiSlice'

const VALID_ROLES = ['admin', 'doctor', 'receptionist', 'nurse'] as const

function loadAuthFromStorage(): { user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return { user: null }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const role = typeof parsed.role === 'string' ? parsed.role.toLowerCase() : ''
    if (!parsed.id || !parsed.name || !VALID_ROLES.includes(role as AuthUser['role'])) return { user: null }
    const user: AuthUser = {
      id: String(parsed.id),
      role: role as AuthUser['role'],
      name: String(parsed.name),
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
    }
    return { user }
  } catch {
    /* ignore */
  }
  return { user: null }
}

const authPreload = loadAuthFromStorage()

function loadThemeFromStorage(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY)
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* ignore */
  }
  return 'light'
}

const themePreload = loadThemeFromStorage()

const authSyncMiddleware: Middleware = () => (next) => (action: unknown) => {
  const result = next(action)
  const a = action as { type: string; payload?: AuthUser | Theme }
  if (a.type === 'auth/login' && a.payload && typeof a.payload === 'object' && 'role' in a.payload) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(a.payload))
  }
  if (a.type === 'auth/logout') {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  if (a.type === 'ui/setTheme' && typeof a.payload === 'string') {
    localStorage.setItem(THEME_STORAGE_KEY, a.payload)
  }
  return result
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    queue: queueReducer,
    beds: bedReducer,
    alerts: alertReducer,
    ui: uiReducer,
  },
  preloadedState: {
    auth: {
      user: authPreload.user,
      isAuthenticated: !!authPreload.user,
    },
    ui: {
      sidebarOpen: true,
      theme: themePreload,
      activeFilters: {},
    },
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authSyncMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
