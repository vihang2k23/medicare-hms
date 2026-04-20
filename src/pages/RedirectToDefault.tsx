import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { getDefaultDashboard } from '../config/roles'

// RedirectToDefault defines the Redirect To Default UI surface and its primary interaction flow.
// RedirectToDefault renders the redirect to default UI.
export default function RedirectToDefault() {
  const user = useSelector((state: RootState) => state.auth.user)
  const to = user ? getDefaultDashboard(user.role) : '/login'
  return <Navigate to={to} replace />
}
