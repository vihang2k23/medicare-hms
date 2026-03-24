# Medicare HMS – Project Flow

This file is the **single place** for architecture, routes, and **end-to-end workflows** implemented in the repo. Update it when you add or change flows.

## Contents (workflow index)

| Section | What it covers |
|---------|----------------|
| [UI stack](#ui-stack) | Tailwind, toasts, Vite tips |
| [Bootstrap & routes](#bootstrap) | Store, `AppRoutes` |
| [Departments vs wards](#departments-vs-inpatient-wards) | Why “top 5 departments” ≠ “3 wards” |
| [Auth & roles](#auth--roles) | Login, roles, `ProtectedRoute` |
| [Login / switch account](#login-flow) | Demo users |
| [Stores](#stores-redux) | Redux slices |
| [Week 2 — Dashboards](#week-2--dashboard-ui-foundation) | Widgets per role |
| [Week 3 — Patients (API)](#week-3--patient-management-part-1) | JSON Server, registration |
| [Week 4 — Profile + queue](#week-4--patient-management-part-2--queue-start) | Edit, OPD start |
| [Week 5 — Queue + beds](#week-5--queue-completion--bed-management) | Full OPD + bed flows + Mermaid |
| [Patient CRUD flow (consolidated)](#patient-crud-flow-consolidated) | List → register → view → edit |
| [Receptionist quick actions](#receptionist-quick-actions-routes) | Links from dashboard |
| [Placeholder routes](#placeholder-routes-not-yet-implemented) | Sidebar items without full UI |
| [Data sources summary](#data-sources-summary) | Live Redux vs JSON Server vs mocks |

---

## Departments vs inpatient wards

- **`config/departments.ts` — `OPD_DEPARTMENTS`** — Clinical / OPD service names (General OPD, Cardiology, …). Used for **token issue**, **“Top 5 departments”** chart (`MOCK_TOP_DEPARTMENTS`), and **doctor availability** mock rows. Count can be **five or more** departments.
- **`config/wards.ts` — `WARDS`** — Inpatient **bed units** (`W1` General Ward, `W2` ICU, `W3` Pediatrics). Used only for **bed management** and related mocks/alerts.

These are **different axes** (outpatient load vs physical wards). Having **5 departments** in analytics and **3 wards** in bed management is **expected** and correct.

---

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
| `/admin/beds` | AdminBedsPage | admin |
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
| `/admin/appointments` | PlaceholderPage | admin |
| `/admin/prescriptions` | PlaceholderPage | admin |
| `/admin/doctors` | PlaceholderPage | admin |
| `/admin/reports` | PlaceholderPage | admin |
| `/doctor/patients` | PlaceholderPage | doctor |
| `/doctor/prescriptions` | PlaceholderPage | doctor |
| `/doctor/schedule` | PlaceholderPage | doctor |
| `/receptionist/appointments` | PlaceholderPage | receptionist |
| `/nurse/vitals` | PlaceholderPage | nurse |
| `*` | Navigate to `/` | — |

## Departments (`config/departments.ts`)
- **OPD / clinical:** `OPD_DEPARTMENTS` — shared by queue counter dropdown (`QueueControls`) and `MOCK_TOP_DEPARTMENTS` / doctor mock rows in `dashboardMockData.ts`.

## Wards (`config/wards.ts`)
- **Single source of truth** for inpatient wards: **`W1` — General Ward**, **`W2` — ICU**, **`W3` — Pediatrics**.
- Use `WARDS`, `wardDisplayName(id)`, and `wardRoomLabel(wardId, bedNumber)` in beds, mocks, and alerts so labels stay consistent.

## Auth & roles

Config: `config/roles.ts`.

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
| queue | OPD tokens (`waiting` / `in-progress` / `done` / `skipped`), optional `department`, `currentToken`, `servedToday`, `simulationRunning`; actions: `issueToken`, `callNext`, `completeCurrent`, `skipCurrent`, `updateTokenStatus`, `markTokenInProgress`, `resetQueue`, `setSimulationStatus` | OPDQueuePage (`QueueAnalytics`, `useQueueAutoAdvance`), QueueBoard, QueueControls, ReceptionistDashboard |
| beds | `Bed` (`status`, optional `patientId` / `occupantName`), `wardSummary`; actions: `setBeds`, `updateBedStatus`, `assignPatientToBed`, `dischargePatientFromBed` | AdminBedsPage, NurseBeds, NurseDashboard, BedGrid |
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

### Charts (Recharts) — admin
- **Bed occupancy donut + “Bed occupancy” stat card** — **live** from Redux `beds.beds` (counts by status; % occupied = occupied / total beds). Same data as **Bed management** / nurse grid.
- **Revenue (bar)** — mock `MOCK_REVENUE_DATA` in `dashboardMockData.ts`.
- **Top 5 departments (horizontal bar)** — mock `MOCK_TOP_DEPARTMENTS` (**clinical departments**, not ward bed counts — see [Departments vs inpatient wards](#departments-vs-inpatient-wards)).
- Other admin stat cards: mix of mock (`MOCK_PATIENTS_TODAY`, revenue headline) and **live** queue (`currentToken`, waiting/done counts) and **live** alerts (last 5).

### Role dashboards (widgets)

| Role | Widgets |
|------|--------|
| **Admin** | Stat cards (patients today, bed occupancy %, OPD queue, revenue); Bed occupancy (donut); Revenue summary (bar); Top departments (horizontal bar); Doctor availability list; Recent alerts (last 5). |
| **Doctor** | Stat cards (prescriptions today, appointments today); Next patient card; Today’s appointments list; Schedule summary. |
| **Receptionist** | Stat cards (registration count, current OPD token, pending appointments); OPD queue live view (QueueBoard); Quick actions (Issue token, Register patient, Book appointment). |
| **Nurse** | Ward bed summary + occupancy; Pending vitals list; Ward bed grid (BedGrid); Recent bed status changes feed. |

### Data
- **Live (Redux):** queue (tokens, `currentToken`, `servedToday`), beds (`beds`, `wardSummary`), alerts.
- **Live (JSON Server):** patient list / register / profile / edit — when `npm run server` is running (`patientsApi.ts`).
- **Static mocks:** `dashboardMockData.ts` — registrations count, pending appointments, revenue series, top departments, doctor availability, doctor appointments, vitals list, recent bed *feed* (narrative), etc.

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

---

## Week 5 — Queue completion + Bed management

### OPD queue — desk flow (manual)

1. **Issue token** — Receptionist/Admin enters name + department → `issueToken` → new `Tnnn` in `waiting`.
2. **Call next** — `callNext`: any `in-progress` → `done` (+`servedToday`); first `waiting` → `in-progress`; `currentToken` updated.
3. **Complete current** — `completeCurrent`: active token → `done`, clear `currentToken`.
4. **Skip & next** — `skipCurrent`: active → `skipped`; next `waiting` promoted if any.
5. **Row status** — `QueueBoard` select: non–in-progress changes use `updateTokenStatus` (keeps `servedToday` / `currentToken` consistent); choosing **In progress** uses `markTokenInProgress` (previous in-progress → `waiting`).
6. **Reset** — `resetQueue` clears tokens, `currentToken`, `servedToday`; UI also stops simulation.

### OPD queue — auto-advance (simulation)

1. User sets interval (4s / 8s / 15s) and clicks **Start simulation** → `setSimulationStatus(true)`.
2. `useQueueAutoAdvance` in `OPDQueuePage` runs `setInterval` → repeated `callNext` while `simulationRunning`.
3. **Stop simulation** or **Reset queue** ends the interval behavior.

### OPD queue — analytics

- **`QueueAnalytics`** derives counts (waiting, in-progress, done, skipped), session token total, completion rate, and shows `servedToday` + `currentToken`.

### Bed & ward flow

1. **Ward summary** — Derived in `bedSlice` (`wardSummary` per `wardId`); `BedGrid` shows cards (free / occupied / reserved / maintenance + occupancy %).
2. **View grid** — Beds grouped by ward; color = `BedStatus`.
3. **Tap bed** — Modal: quick **status** buttons → `updateBedStatus` (leaving `occupied` clears occupant fields).
4. **Admit / assign** — On `available` or `reserved`: name (+ optional registry ID) → `assignPatientToBed` → `occupied` + summary counts updated.
5. **Discharge** — On `occupied`: `dischargePatientFromBed` → `available`, occupant cleared.
6. **Shared state** — Admin (`/admin/beds`) and Nurse (`/nurse/beds`) use the same Redux `beds` slice (session-only; not JSON Server).

### Flow diagrams (Mermaid)

**OPD token lifecycle**

```mermaid
stateDiagram-v2
  state "in-progress" as InProgress
  [*] --> waiting: issueToken
  waiting --> InProgress: callNext / markTokenInProgress
  InProgress --> done: completeCurrent / callNext / updateTokenStatus
  InProgress --> skipped: skipCurrent / updateTokenStatus
  skipped --> waiting: updateTokenStatus
  skipped --> InProgress: markTokenInProgress
  waiting --> done: updateTokenStatus
  waiting --> skipped: updateTokenStatus
  done --> [*]
```

**Bed status & admission**

```mermaid
flowchart LR
  subgraph status [Status changes]
    A[available]
    R[reserved]
    O[occupied]
    M[maintenance]
  end
  A -->|updateBedStatus| R
  A -->|updateBedStatus| M
  R -->|updateBedStatus| A
  R -->|updateBedStatus| M
  M -->|updateBedStatus| A
  A -->|assignPatientToBed| O
  R -->|assignPatientToBed| O
  O -->|dischargePatientFromBed| A
  O -->|updateBedStatus| R
  O -->|updateBedStatus| M
  O -->|updateBedStatus| A
```

### Key files (Week 5)

| Area | Files |
|------|--------|
| Queue slice + hooks | `src/features/queue/queueSlice.ts`, `useQueueAutoAdvance.ts` |
| Queue UI | `QueueControls.tsx`, `QueueBoard.tsx`, `QueueAnalytics.tsx` |
| Queue page | `src/pages/OPDQueuePage.tsx`, `ReceptionistQueue.tsx` |
| Beds slice | `src/features/beds/bedSlice.ts` |
| Beds UI | `src/features/beds/BedGrid.tsx` |
| Pages | `AdminBedsPage.tsx`, `NurseBeds.tsx`, `NurseDashboard.tsx` |
| Routes | `src/routes/AppRoutes.tsx` (`admin/beds`) |

---

## Patient CRUD flow (consolidated)

1. **List** — Admin opens `/admin/patients` → `PatientListPage` → `fetchPatients()` / search / filters / pagination.
2. **Register** — Admin `/admin/patients/new` or Receptionist `/receptionist/registration` → `PatientRegistrationForm` → `createPatient()` → JSON Server.
3. **Profile** — `/admin/patients/:patientId` → `PatientProfilePage` → `fetchPatientById()`.
4. **Edit** — `/admin/patients/:patientId/edit` → `PatientEditPage` → `updatePatient()` (PATCH).
5. **Deactivate** — soft delete from list (`softDeletePatient`).

---

## Receptionist quick actions (routes)

From **Receptionist dashboard**, quick links target:

| Action | Route |
|--------|--------|
| Issue token | `/receptionist/queue` |
| Register new patient | `/receptionist/registration` |
| Book appointment | `/receptionist/appointments` (placeholder until scheduling module exists) |

---

## Placeholder routes (not yet implemented)

Sidebar may show **Appointments**, **Prescriptions**, **Doctor directory**, **Reports**, **Doctor schedule**, **Vitals**, etc. Those URLs render **`PlaceholderPage`** until the module is built. See [Route Tree](#route-tree) for paths.

---

## Data sources summary

| Data | Where it lives | Persists across refresh? |
|------|----------------|---------------------------|
| Auth user | Redux + `localStorage` | Yes (session) |
| Theme | Redux + `localStorage` | Yes |
| OPD queue | Redux only | No |
| Beds & ward summary | Redux only | No |
| Alerts | Redux only | No |
| Patients | JSON Server (`server/db.json`) | Yes (file on disk) |
| Dashboard charts (non-bed) | `dashboardMockData.ts` | N/A (static) |
