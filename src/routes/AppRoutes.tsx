import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../layout/MainLayout'
import Login from '../pages/Login'
import RedirectToDefault from '../pages/RedirectToDefault'
import AdminDashboard from '../pages/AdminDashboard'
import DoctorDashboard from '../pages/DoctorDashboard'
import ReceptionistDashboard from '../pages/ReceptionistDashboard'
import ReceptionistQueue from '../pages/ReceptionistQueue'
import NurseDashboard from '../pages/NurseDashboard'
import NurseBeds from '../pages/NurseBeds'
import AccessDenied from '../pages/AccessDenied'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<RedirectToDefault />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="doctor" element={<DoctorDashboard />} />
          <Route path="receptionist" element={<ReceptionistDashboard />} />
          <Route path="receptionist/queue" element={<ReceptionistQueue />} />
          <Route path="nurse" element={<NurseDashboard />} />
          <Route path="nurse/beds" element={<NurseBeds />} />
          <Route path="access-denied" element={<AccessDenied />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
