# Medicare HMS – Project Flow

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
| `/doctor` | DoctorDashboard | doctor |
| `/receptionist` | ReceptionistDashboard | receptionist |
| `/receptionist/queue` | ReceptionistQueue | receptionist |
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
| queue | OPD tokens, currentToken, simulationRunning | ReceptionistDashboard, QueueBoard |
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
