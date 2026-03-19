import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { getDefaultDashboard } from '../config/roles'

export default function RedirectToDefault() {
  const user = useSelector((state: RootState) => state.auth.user)
  const to = user ? getDefaultDashboard(user.role) : '/login'
  return <Navigate to={to} replace />
}
