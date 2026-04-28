import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BedDouble,
  Calendar,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Stethoscope,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react'
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
  icon?: any
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
  dashboard: { path: 'admin', element: AdminDashboard, icon: LayoutDashboard },
  routes: [
    { path: 'admin/opd-queue', element: OPDQueuePage, props: { title: 'OPD queue', description: 'Admin view — same live queue as reception.' }, icon: ListOrdered },
    { path: 'admin/beds', element: AdminBedsPage, icon: BedDouble },
    { path: 'admin/patients', element: PatientListPage, icon: Users },
    { path: 'admin/patients/new', element: PatientRegistrationPage },
    { path: 'admin/patients/:patientId/edit', element: PatientEditPage },
    { path: 'admin/patients/:patientId', element: PatientProfilePage },
    { path: 'admin/appointments', element: AppointmentsPage, props: { variant: 'admin' }, icon: Calendar },
    { path: 'admin/prescriptions', element: PrescriptionsPage, props: { variant: 'admin' }, icon: FileText },
    { path: 'admin/prescriptions/:prescriptionId/print', element: AdminPrescriptionPrintPage },
    { path: 'admin/doctors', element: DoctorDirectoryPage, icon: Stethoscope },
    { path: 'admin/reports', element: ReportsPage, icon: BarChart3 },
  ]
}

const doctorRoutes: RoleRoutes = {
  dashboard: { path: 'doctor', element: DoctorDashboard, icon: LayoutDashboard },
  routes: [
    { path: 'doctor/patients', element: DoctorMyPatientsPage, icon: Users },
    { path: 'doctor/patients/:patientId', element: DoctorPatientProfilePage },
    { path: 'doctor/prescriptions', element: PrescriptionsPage, props: { variant: 'doctor' }, icon: FileText },
    { path: 'doctor/prescriptions/:prescriptionId/print', element: DoctorPrescriptionPrintPage },
    { path: 'doctor/schedule', element: AppointmentsPage, props: { variant: 'doctor' }, icon: Calendar },
  ]
}

const receptionistRoutes: RoleRoutes = {
  dashboard: { path: 'receptionist', element: ReceptionistDashboard, icon: LayoutDashboard },
  routes: [
    { path: 'receptionist/queue', element: ReceptionistQueue, icon: Ticket },
    { path: 'receptionist/registration', element: PatientRegistrationPage, icon: UserPlus },
    { path: 'receptionist/appointments', element: AppointmentsPage, props: { variant: 'receptionist' }, icon: Calendar },
  ]
}

const nurseRoutes: RoleRoutes = {
  dashboard: { path: 'nurse', element: NurseDashboard, icon: LayoutDashboard },
  routes: [
    { path: 'nurse/beds', element: NurseBeds, icon: BedDouble },
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

// Export route configurations for use in sidebar and other components
export const ROUTES_CONFIG = {
  admin: adminRoutes,
  doctor: doctorRoutes,
  receptionist: receptionistRoutes,
  nurse: nurseRoutes,
}

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
