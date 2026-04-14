import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { RootState } from '../app/store'
import { canAccessPath } from '../shared/config/roles'

/**
 * Role-based route protection:
 * - Not authenticated → redirect to login
 * - Authenticated but role cannot access this path → redirect to Access Denied (not login)
 */
export default function ProtectedRoute() {
  const user = useSelector((state: RootState) => state.auth.user)
  const location = useLocation()
  const pathname = location.pathname

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessPath(user.role, pathname)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
