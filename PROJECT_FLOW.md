# Medicare HMS – Project Flow

## UI stack
- **Typography:** Plus Jakarta Sans (Google Fonts) + Tailwind `@theme --font-sans` in `index.css`.
- **Chrome:** Soft gradient page background (`.app-surface-gradient`), glass-style Navbar/Sidebar (`backdrop-blur`, translucent panels), `rounded-2xl` cards with light rings/shadows, gradient primary buttons.
- **Icons:** [Lucide React](https://lucide.dev/) — `config/navIcons.tsx`; Navbar, Sidebar, Login, dashboards, queue, placeholders.
- **Toasts:** [react-hot-toast](https://react-hot-toast.com/) — `AppToaster` in `App.tsx`, `lib/notify.ts`.

### Vite: `504 (Outdated Optimize Dep)` on `.vite/deps/…`
Happens when the dev server’s **pre-bundle cache** (`node_modules/.vite`) is older than your dependencies (e.g. after `npm install` of new packages). **Fix:** stop the dev server, run `rm -rf node_modules/.vite`, start again with `npm run dev` — or use `npm run dev:force` once. `vite.config.ts` lists `lucide-react` and `react-hot-toast` under `optimizeDeps.include` to reduce repeats.

## Bootstrap
- **main.tsx** → `Provider(store)` → **App.tsx** → `BrowserRouter` → **AppRoutes**
- **store** (`app/store.ts`): Auth preloaded from `localStorage` (`medicare_auth`). Middleware syncs login/logout to `localStorage`.

## Route Tree
| Path | Component | Access |
|------|-----------|--------|
| `/login` | Login | Public |
| `/` | ProtectedRoute → MainLayout | Auth + role |
| `/` (index) | RedirectToDefault | → role default dashboard |
| `/admin` | AdminDashboard | admin |
| `/admin/opd-queue` | OPDQueuePage | admin |
| `/doctor` | DoctorDashboard | doctor |
| `/receptionist` | ReceptionistDashboard | receptionist |
| `/receptionist/queue` | ReceptionistQueue → OPDQueuePage | receptionist |
| `/receptionist/registration` | PatientRegistrationPage | receptionist |
| `/admin/patients` | PatientListPage | admin |
| `/admin/patients/new` | PatientRegistrationPage | admin |
| `/admin/patients/:patientId` | PatientProfilePage | admin |
| `/admin/patients/:patientId/edit` | PatientEditPage | admin |
| `/nurse` | NurseDashboard | nurse |
| `/nurse/beds` | NurseBeds | nurse |
| `/access-denied` | AccessDenied | any authenticated |
| `*` | Navigate to `/` | — |

## Auth & Roles (`config/roles.ts`)
- **Roles:** admin, doctor, receptionist, nurse
- **Default dashboards:** admin→`/admin`, doctor→`/doctor`, receptionist→`/receptionist`, nurse→`/nurse`
- **ProtectedRoute:** No user → `/login`. User but wrong role for path → `/access-denied`. Else → render child.

## Login Flow
1. User on `/login` clicks a role card.
2. `dispatch(login({ id, role, name, avatar }))` → store + `localStorage`.
3. `navigate(getDefaultDashboard(role))` → role’s dashboard.

## Switch Account (Navbar)
1. User opens dropdown, picks another demo user.
2. `dispatch(login(toAuthUser(u)))` then `setTimeout(() => navigate(getDefaultDashboard(u.role)), 0)`.
3. User and URL change to that role’s dashboard.

## Layout
- **MainLayout:** Navbar + Sidebar + `<Outlet />`.
- **Sidebar:** Links from `SIDEBAR_LINKS[user.role]`; toggle from `ui.sidebarOpen`.

## Stores (Redux)
| Store | Purpose | Used in |
|-------|--------|--------|
| auth | user, isAuthenticated; synced with localStorage | ProtectedRoute, Login, Navbar, Sidebar, useAuth |
| queue | OPD tokens (`waiting` / `in-progress` / `done` / `skipped`), optional `department`, `currentToken`, `servedToday`, `simulationRunning`; actions: `issueToken`, `callNext`, `completeCurrent`, `skipCurrent`, `resetQueue` | OPDQueuePage, QueueBoard, QueueControls, ReceptionistDashboard |
| beds | beds, wardSummary | NurseDashboard, BedGrid |
| alerts | last 20 alerts | AdminDashboard, NotificationBell |
| ui | sidebarOpen, theme, activeFilters | Sidebar |

## Hook
- **useAuth()** → `{ user, isAuthenticated, role, logout }` from auth store.

---

## Week 2 — Dashboard (UI Foundation)

### Dashboard layout (all roles)
- Each role has a dedicated dashboard page with a welcome header and a grid of widgets.
- **Admin** (`/admin`), **Doctor** (`/doctor`), **Receptionist** (`/receptionist`), **Nurse** (`/nurse`).

### Reusable UI components
- **DashboardCard** (`components/ui/DashboardCard.tsx`) — Container with optional title, border, shadow, dark-mode support.
- **StatCard** (`components/ui/StatCard.tsx`) — Label, value, optional subLabel and icon; accent variants (blue, green, amber, red, slate).

### Charts (Recharts, static/mock data)
- **Admin:** Pie chart (bed occupancy), bar chart (revenue last 7 days), horizontal bar (top 5 departments).
- Mock data lives in **`src/data/dashboardMockData.ts`** (patients today, bed occupancy, revenue, departments, doctor availability, appointments, vitals, bed changes).

### Role dashboards (widgets)

| Role | Widgets |
|------|--------|
| **Admin** | Stat cards (patients today, bed occupancy %, OPD queue, revenue); Bed occupancy (donut); Revenue summary (bar); Top departments (horizontal bar); Doctor availability list; Recent alerts (last 5). |
| **Doctor** | Stat cards (prescriptions today, appointments today); Next patient card; Today’s appointments list; Schedule summary. |
| **Receptionist** | Stat cards (registration count, current OPD token, pending appointments); OPD queue live view (QueueBoard); Quick actions (Issue token, Register patient, Book appointment). |
| **Nurse** | Ward bed summary + occupancy; Pending vitals list; Ward bed grid (BedGrid); Recent bed status changes feed. |

### Data
- **Live:** queue (tokens, currentToken), beds (wardSummary), alerts — from RTK store.
- **Static:** `dashboardMockData.ts` for counts, appointments, vitals, revenue, departments, doctor availability (replace with JSON Server/API later).

### UI polish
- All dashboard components use Tailwind with **dark:** variants.
- QueueBoard and BedGrid support dark mode.

---

## Week 3 — Patient management (Part 1)

### JSON Server (REST API)
- **Data file:** `server/db.json` — `{ "patients": [] }` (JSON Server watches this file).
- **Run API:** `npm run server` → `http://localhost:3001` (default `GET/POST /patients`).
- **Client:** `src/config/api.ts` — `getJsonServerBaseUrl()` (env `VITE_JSON_SERVER_URL` or `http://localhost:3001`).
- **API helpers:** `src/api/patientsApi.ts` — `fetchPatients()`, `fetchAllPatients()`, `fetchPatientById()`, `createPatient()`, `updatePatient()` (PATCH), `softDeletePatient()` (`isActive: false`).
- **Types:** `src/types/patient.ts` — `PatientRecord` (same fields as before; stored as JSON).

### Registration form
- **Component:** `src/features/patients/PatientRegistrationForm.tsx` — 5 steps (Personal → Contact → Medical → Emergency → Review) + progress bar.
- **Validation:** **React Hook Form** + **Zod** (`patientRegistrationSchema` + per-step schemas in `patientSchemas.ts`). Step “Next” validates current step via `safeParse` + `trigger`.
- **ID:** `generatePatientId()` → `MED-YYYY-XXXX` (collision check via `fetchPatients()`).
- **Routes:** `/admin/patients/new` and `/receptionist/registration` (redirect after save: admin → patient list, receptionist → dashboard).

### Patient list (admin)
- **Page:** `src/pages/PatientListPage.tsx` — active patients; search (name / phone / email / ID); filters (blood group, gender); pagination; **View** / **Edit** / **Deactivate** (soft delete).

---

## Week 4 — Patient management (Part 2) + queue start

### Patient profile & edit
- **Profile:** `PatientProfilePage` at `/admin/patients/:patientId` — tabs: Overview, Medical, Emergency.
- **Edit:** `PatientEditPage` at `/admin/patients/:patientId/edit` — reuses `PatientRegistrationForm` with `initialRecord` + `updatePatient` (PATCH).
- **Mapper:** `patientRecordToFormValues()` in `patientSchemas.ts` for edit defaults.

### OPD queue (RTK)
- **Slice:** `src/features/queue/queueSlice.ts` — sequential token IDs `T001`, `T002`, … via `nextTokenNumber()`; `issueToken`, `callNext`, `completeCurrent`, `skipCurrent`, `resetQueue`.
- **UI:** `QueueControls` (issue + desk actions), `QueueBoard` (sorted list + status badges), composed in `OPDQueuePage`.
- **Routes:** `/receptionist/queue` and `/admin/opd-queue` share `OPDQueuePage` (same Redux queue state).
