import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { RootState } from '../store'
import { canAccessPath } from '../config/roles'

// ProtectedRoute defines the Protected Route UI surface and its primary interaction flow.
/**
 * Role-based route protection:
 * - Not authenticated → redirect to login
 * - Authenticated but role cannot access this path → redirect to Access Denied (not login)
 */
export default function ProtectedRoute() {
  const user = useSelector((state: RootState) => state.auth.user)
  const location = useLocation()
  const pathname = location.pathname
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Small delay to ensure Redux store is fully initialized
    const timer = setTimeout(() => {
      setIsInitialized(true)
      console.log('[ProtectedRoute] Initialized', { pathname, user: user?.id, isAuthenticated: !!user })
    }, 50)
    return () => clearTimeout(timer)
  }, [pathname, user])

  if (!isInitialized) {
    return null
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login', { pathname })
    return <Navigate to="/login" replace />
  }

  if (!canAccessPath(user.role, pathname)) {
    console.log('[ProtectedRoute] Access denied', { pathname, role: user.role })
    return <Navigate to="/access-denied" replace />
  }

  console.log('[ProtectedRoute] Access granted', { pathname, role: user.role })
  return <Outlet />
}
