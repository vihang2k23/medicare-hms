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

// Lazy loaded components
const Login = lazy(() => import('../pages/Login'))
const RedirectToDefault = lazy(() => import('../pages/RedirectToDefault'))
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'))
const DoctorDashboard = lazy(() => import('../pages/DoctorDashboard'))
const ReceptionistDashboard = lazy(() => import('../pages/ReceptionistDashboard'))
const ReceptionistQueue = lazy(() => import('../pages/ReceptionistQueue'))
const NurseDashboard = lazy(() => import('../pages/NurseDashboard'))
const NurseBeds = lazy(() => import('../pages/NurseBeds'))
const AccessDenied = lazy(() => import('../pages/AccessDenied'))
const PatientListPage = lazy(() => import('../pages/PatientListPage'))
const PatientRegistrationPage = lazy(() => import('../pages/PatientRegistrationPage'))
const PatientProfilePage = lazy(() => import('../pages/PatientProfilePage'))
const PatientEditPage = lazy(() => import('../pages/PatientEditPage'))
const OPDQueuePage = lazy(() => import('../pages/OPDQueuePage'))
const AdminBedsPage = lazy(() => import('../pages/AdminBedsPage'))
const AppointmentsPage = lazy(() => import('../pages/AppointmentsPage'))
const PrescriptionsPage = lazy(() => import('../pages/PrescriptionsPage'))
const PrescriptionPrintPage = lazy(() => import('../pages/PrescriptionPrintPage'))
const DoctorDirectoryPage = lazy(() => import('../pages/DoctorDirectoryPage'))
const DoctorMyPatientsPage = lazy(() => import('../pages/DoctorMyPatientsPage'))
const DoctorPatientProfilePage = lazy(() => import('../pages/DoctorPatientProfilePage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
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

// Wrapper for lazy loading with suspense
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 dark:text-white">Loading…</div>}>
      {children}
    </Suspense>
  )
}

const lazyRoutes: JSXRouteConfig[] = [
  {
    path: 'nurse/vitals/patient/:patientId',
    element: (
      <LazyRoute>
        <VitalsPatientDetailPage />
      </LazyRoute>
    )
  },
  {
    path: 'nurse/vitals',
    element: (
      <LazyRoute>
        <VitalsEntryPage />
      </LazyRoute>
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
      <Route key={path} path={path} element={
        <LazyRoute>
          {props ? <Element {...props} /> : <Element />}
        </LazyRoute>
      } />
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
      <Route path={roleRoutes.dashboard.path} element={
        <LazyRoute>
          <roleRoutes.dashboard.element />
        </LazyRoute>
      } />
      {renderRoutes(roleRoutes.routes)}
    </>
  )
}

// AppRoutes defines the App Routes UI surface and its primary interaction flow.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <LazyRoute>
          <Login />
        </LazyRoute>
      } />
      <Route path="/" element={<ProtectedRoute />}>
        {/* Main shell groups all authenticated routes under a shared layout. */}
        <Route element={<MainLayout />}>
          <Route index element={
            <LazyRoute>
              <RedirectToDefault />
            </LazyRoute>
          } />
          
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
