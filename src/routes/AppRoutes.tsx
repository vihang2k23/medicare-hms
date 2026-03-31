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
import PatientProfilePage from '../pages/PatientProfilePage'
import PatientEditPage from '../pages/PatientEditPage'
import OPDQueuePage from '../pages/OPDQueuePage'
import AdminBedsPage from '../pages/AdminBedsPage'
import AppointmentsPage from '../pages/AppointmentsPage'
import PrescriptionsPage from '../pages/PrescriptionsPage'
import DoctorDirectoryPage from '../pages/DoctorDirectoryPage'
import ReportsPage from '../pages/ReportsPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<RedirectToDefault />} />
          {/* Admin */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/opd-queue" element={<OPDQueuePage title="OPD queue" description="Admin view — same live queue as reception." />} />
          <Route path="admin/beds" element={<AdminBedsPage />} />
          <Route path="admin/patients" element={<PatientListPage />} />
          <Route path="admin/patients/new" element={<PatientRegistrationPage />} />
          <Route path="admin/patients/:patientId/edit" element={<PatientEditPage />} />
          <Route path="admin/patients/:patientId" element={<PatientProfilePage />} />
          <Route path="admin/appointments" element={<AppointmentsPage variant="admin" />} />
          <Route path="admin/prescriptions" element={<PrescriptionsPage variant="admin" />} />
          <Route path="admin/doctors" element={<DoctorDirectoryPage />} />
          <Route path="admin/reports" element={<ReportsPage />} />
          {/* Doctor */}
          <Route path="doctor" element={<DoctorDashboard />} />
          <Route path="doctor/patients" element={<PlaceholderPage title="My Patients" />} />
          <Route path="doctor/prescriptions" element={<PrescriptionsPage variant="doctor" />} />
          <Route path="doctor/schedule" element={<AppointmentsPage variant="doctor" />} />
          {/* Receptionist */}
          <Route path="receptionist" element={<ReceptionistDashboard />} />
          <Route path="receptionist/queue" element={<ReceptionistQueue />} />
          <Route path="receptionist/registration" element={<PatientRegistrationPage />} />
          <Route path="receptionist/appointments" element={<AppointmentsPage variant="receptionist" />} />
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
