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
import PlaceholderPage from '../components/PlaceholderPage'
import PatientListPage from '../pages/PatientListPage'
import PatientRegistrationPage from '../pages/PatientRegistrationPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<RedirectToDefault />} />
          {/* Admin */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/opd-queue" element={<PlaceholderPage title="OPD Queue" />} />
          <Route path="admin/beds" element={<PlaceholderPage title="Bed Management" />} />
          <Route path="admin/patients" element={<PatientListPage />} />
          <Route path="admin/patients/new" element={<PatientRegistrationPage />} />
          <Route path="admin/appointments" element={<PlaceholderPage title="Appointments" />} />
          <Route path="admin/prescriptions" element={<PlaceholderPage title="Prescriptions" />} />
          <Route path="admin/doctors" element={<PlaceholderPage title="Doctor Directory" />} />
          <Route path="admin/reports" element={<PlaceholderPage title="Reports & Analytics" />} />
          {/* Doctor */}
          <Route path="doctor" element={<DoctorDashboard />} />
          <Route path="doctor/patients" element={<PlaceholderPage title="My Patients" />} />
          <Route path="doctor/prescriptions" element={<PlaceholderPage title="Prescriptions" />} />
          <Route path="doctor/schedule" element={<PlaceholderPage title="My Schedule" />} />
          {/* Receptionist */}
          <Route path="receptionist" element={<ReceptionistDashboard />} />
          <Route path="receptionist/queue" element={<ReceptionistQueue />} />
          <Route path="receptionist/registration" element={<PatientRegistrationPage />} />
          <Route path="receptionist/appointments" element={<PlaceholderPage title="Appointments" />} />
          {/* Nurse */}
          <Route path="nurse" element={<NurseDashboard />} />
          <Route path="nurse/beds" element={<NurseBeds />} />
          <Route path="nurse/vitals" element={<PlaceholderPage title="Vitals Entry" />} />
          {/* Shared */}
          <Route path="access-denied" element={<AccessDenied />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
