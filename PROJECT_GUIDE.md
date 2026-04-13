# MediCare HMS — project guide (routes & code map)

Single reference for **URLs → pages → main code**. Routing is defined in `src/routes/AppRoutes.tsx`. Access control: `src/routes/ProtectedRoute.tsx` + `src/config/roles.ts`.

## Stack (short)

- **UI:** React 19, TypeScript, Vite, Tailwind  
- **State:** Redux Toolkit (`src/app/store.ts`)  
- **API (demo):** JSON Server (`npm run server`, `server/jsonServer.mjs`, REST under `/api/...`)  
- **Client API base:** `src/config/api.ts` (`VITE_JSON_SERVER_URL` / same-origin on unified deploy)

---

## App shell

| Area | File(s) |
|------|---------|
| Entry | `src/main.tsx` → `src/App.tsx` |
| Routes | `src/routes/AppRoutes.tsx` |
| Auth gate | `src/routes/ProtectedRoute.tsx` |
| Layout | `src/layout/MainLayout.tsx`, `Navbar.tsx`, `Sidebar.tsx` |
| Role menus | `src/config/roles.ts` (`ROLE_CONFIG`, `DEFAULT_DASHBOARD`, `canAccessPath`) |
| Toasts | `src/lib/notify.ts`, `src/components/ui/AppToaster.tsx` |

---

## Global / shared routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/login` | `src/pages/Login.tsx` | Demo login; Redux `login`; navigate to role dashboard |
| `/` | `src/pages/RedirectToDefault.tsx` | Redirect to `DEFAULT_DASHBOARD[role]` |
| `/access-denied` | `src/pages/AccessDenied.tsx` | Role cannot open requested path |
| `*` | `Navigate` → `/` | Unknown URLs |

---

## Admin (`/admin/...`)

| Path | Page | Notes |
|------|------|--------|
| `/admin` | `AdminDashboard.tsx` | Summary cards, links |
| `/admin/opd-queue` | `OPDQueuePage.tsx` | Queue: `features/queue/*`, `queueSlice` |
| `/admin/beds` | `AdminBedsPage.tsx` | `BedGrid` + ward admin (`WardManagementPanel`) |
| `/admin/patients` | `PatientListPage.tsx` | List/search; `patientsApi` |
| `/admin/patients/new` | `PatientRegistrationPage.tsx` | `PatientRegistrationForm` |
| `/admin/patients/:id` | `PatientProfilePage.tsx` | Profile + vitals |
| `/admin/patients/:id/edit` | `PatientEditPage.tsx` | Edit patient |
| `/admin/appointments` | `AppointmentsPage.tsx` (`variant="admin"`) | `appointmentsSlice`, `AppointmentDialogs` |
| `/admin/prescriptions` | `PrescriptionsPage.tsx` (`variant="admin"`) | `features/prescriptions/*` |
| `/admin/prescriptions/:id/print` | `PrescriptionPrintPage.tsx` | Print layout |
| `/admin/doctors` | `DoctorDirectoryPage.tsx` | NPI + internal doctors, modals |
| `/admin/reports` | `ReportsPage.tsx` | Charts / exports from Redux demo data |

---

## Doctor (`/doctor/...`)

| Path | Page |
|------|------|
| `/doctor` | `DoctorDashboard.tsx` |
| `/doctor/patients` | `DoctorMyPatientsPage.tsx` |
| `/doctor/patients/:id` | `DoctorPatientProfilePage.tsx` |
| `/doctor/prescriptions` | `PrescriptionsPage.tsx` (`variant="doctor"`) |
| `/doctor/prescriptions/:id/print` | `PrescriptionPrintPage.tsx` |
| `/doctor/schedule` | `AppointmentsPage.tsx` (`variant="doctor"`) |

---

## Receptionist (`/receptionist/...`)

| Path | Page |
|------|------|
| `/receptionist` | `ReceptionistDashboard.tsx` |
| `/receptionist/queue` | `ReceptionistQueue.tsx` → wraps `OPDQueuePage` |
| `/receptionist/registration` | `PatientRegistrationPage.tsx` |
| `/receptionist/appointments` | `AppointmentsPage.tsx` (`variant="receptionist"`) |

---

## Nurse (`/nurse/...`)

| Path | Page |
|------|------|
| `/nurse` | `NurseDashboard.tsx` |
| `/nurse/beds` | `NurseBeds.tsx` → `BedGrid` (no ward CRUD) |
| `/nurse/vitals` | `VitalsEntryPage.tsx` (lazy) |
| `/nurse/vitals/patient/:patientId` | `VitalsPatientDetailPage.tsx` (lazy) |

---

## Feature folders (cross-cutting)

| Domain | Typical paths |
|--------|----------------|
| Patients | `src/api/patientsApi.ts`, `src/features/patients/*`, `src/types/patient.ts` |
| Vitals | `src/api/vitalsApi.ts`, `src/components/vitals/*` |
| OPD queue | `src/features/queue/*` (`queueSlice`, `QueueControls`, `QueueBoard`, …) |
| Beds / wards | `src/features/beds/*` (`bedSlice`, `BedGrid`, `WardManagementPanel`) |
| Appointments | `src/features/appointments/*` |
| Prescriptions | `src/features/prescriptions/*` |
| Alerts (navbar) | `src/features/alerts/*` |
| Modals / scroll lock | `src/hooks/useModalScrollLock.ts`, `src/components/ui/modalOverlayClasses.ts` |

---59751

## Deploy (Render)

- Blueprint: `render.yaml` (single Node service: build + `npm run server` serves SPA + `/api`)  
- Details: `README.md` → “Deploy on Render”

---

*Generated as a single project map; update this file when you add routes or rename pages.*
