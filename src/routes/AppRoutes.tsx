import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import MainLayout from '../layout/MainLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import AccessDenied from '../pages/AccessDenied'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="access-denied" element={<AccessDenied />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
