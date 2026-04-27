import { lazy, Suspense } from 'react'
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
import PatientListPage from '../pages/PatientListPage'
import PatientRegistrationPage from '../pages/PatientRegistrationPage'
import PatientProfilePage from '../pages/PatientProfilePage'
import PatientEditPage from '../pages/PatientEditPage'
import OPDQueuePage from '../pages/OPDQueuePage'
import AdminBedsPage from '../pages/AdminBedsPage'
import AppointmentsPage from '../pages/AppointmentsPage'
import PrescriptionsPage from '../pages/PrescriptionsPage'
import PrescriptionPrintPage from '../pages/PrescriptionPrintPage'
import DoctorDirectoryPage from '../pages/DoctorDirectoryPage'
import DoctorMyPatientsPage from '../pages/DoctorMyPatientsPage'
import DoctorPatientProfilePage from '../pages/DoctorPatientProfilePage'
import ReportsPage from '../pages/ReportsPage'

// Lazy loaded components
const VitalsEntryPage = lazy(() => import('../pages/VitalsEntryPage'))
const VitalsPatientDetailPage = lazy(() => import('../pages/VitalsPatientDetailPage'))

// Wrapper components for routes that require specific props
const AdminPrescriptionPrintPage = () => <PrescriptionPrintPage variant="admin" />
const DoctorPrescriptionPrintPage = () => <PrescriptionPrintPage variant="doctor" />

// Route configuration type
interface RouteConfig {
  path: string
  element: React.ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
}

interface JSXRouteConfig {
  path: string
  element: React.ReactElement
}

interface RoleRoutes {
  dashboard: RouteConfig
  routes: RouteConfig[]
}

// Route configurations
const adminRoutes: RoleRoutes = {
  dashboard: { path: 'admin', element: AdminDashboard },
  routes: [
    { path: 'admin/opd-queue', element: OPDQueuePage, props: { title: 'OPD queue', description: 'Admin view — same live queue as reception.' } },
    { path: 'admin/beds', element: AdminBedsPage },
    { path: 'admin/patients', element: PatientListPage },
    { path: 'admin/patients/new', element: PatientRegistrationPage },
    { path: 'admin/patients/:patientId/edit', element: PatientEditPage },
    { path: 'admin/patients/:patientId', element: PatientProfilePage },
    { path: 'admin/appointments', element: AppointmentsPage, props: { variant: 'admin' } },
    { path: 'admin/prescriptions', element: PrescriptionsPage, props: { variant: 'admin' } },
    { path: 'admin/prescriptions/:prescriptionId/print', element: AdminPrescriptionPrintPage },
    { path: 'admin/doctors', element: DoctorDirectoryPage },
    { path: 'admin/reports', element: ReportsPage },
  ]
}

const doctorRoutes: RoleRoutes = {
  dashboard: { path: 'doctor', element: DoctorDashboard },
  routes: [
    { path: 'doctor/patients', element: DoctorMyPatientsPage },
    { path: 'doctor/patients/:patientId', element: DoctorPatientProfilePage },
    { path: 'doctor/prescriptions', element: PrescriptionsPage, props: { variant: 'doctor' } },
    { path: 'doctor/prescriptions/:prescriptionId/print', element: DoctorPrescriptionPrintPage },
    { path: 'doctor/schedule', element: AppointmentsPage, props: { variant: 'doctor' } },
  ]
}

const receptionistRoutes: RoleRoutes = {
  dashboard: { path: 'receptionist', element: ReceptionistDashboard },
  routes: [
    { path: 'receptionist/queue', element: ReceptionistQueue },
    { path: 'receptionist/registration', element: PatientRegistrationPage },
    { path: 'receptionist/appointments', element: AppointmentsPage, props: { variant: 'receptionist' } },
  ]
}

const nurseRoutes: RoleRoutes = {
  dashboard: { path: 'nurse', element: NurseDashboard },
  routes: [
    { path: 'nurse/beds', element: NurseBeds },
  ]
}

const lazyRoutes: JSXRouteConfig[] = [
  {
    path: 'nurse/vitals/patient/:patientId',
    element: (
      <Suspense fallback={<div className="p-6 text-slate-500 dark:text-white">Loading vitals…</div>}>
        <VitalsPatientDetailPage />
      </Suspense>
    )
  },
  {
    path: 'nurse/vitals',
    element: (
      <Suspense fallback={<div className="p-6 text-slate-500 dark:text-white">Loading vitals…</div>}>
        <VitalsEntryPage />
      </Suspense>
    )
  }
]

const sharedRoutes: RouteConfig[] = [
  { path: 'access-denied', element: AccessDenied }
]

// Helper function to render routes from configuration
function renderRoutes(routes: RouteConfig[]) {
  return routes.map(({ path, element, props }) => {
    const Element = element as React.ComponentType<Record<string, unknown>>
    return (
      <Route key={path} path={path} element={props ? <Element {...props} /> : <Element />} />
    )
  })
}

function renderJSXRoutes(routes: JSXRouteConfig[]) {
  return routes.map(({ path, element }) => (
    <Route key={path} path={path} element={element} />
  ))
}

function renderRoleRoutes(roleRoutes: RoleRoutes) {
  return (
    <>
      <Route path={roleRoutes.dashboard.path} element={<roleRoutes.dashboard.element />} />
      {renderRoutes(roleRoutes.routes)}
    </>
  )
}

// AppRoutes defines the App Routes UI surface and its primary interaction flow.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        {/* Main shell groups all authenticated routes under a shared layout. */}
        <Route element={<MainLayout />}>
          <Route index element={<RedirectToDefault />} />
          
          {/* Role-based routes */}
          {renderRoleRoutes(adminRoutes)}
          {renderRoleRoutes(doctorRoutes)}
          {renderRoleRoutes(receptionistRoutes)}
          {renderRoleRoutes(nurseRoutes)}
          
          {/* Lazy loaded routes */}
          {renderJSXRoutes(lazyRoutes)}
          
          {/* Shared routes */}
          {renderRoutes(sharedRoutes)}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
