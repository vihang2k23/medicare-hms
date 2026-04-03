# MediCare HMS – Requirements Reference (from PRD)

**Stack choices for this project:**  
- **State:** RTK (Redux Toolkit) instead of Zustand  
- **Persistent data:** JSON Server (REST API) only — no IndexedDB / client-side DB layer  
- Rest of stack as per doc: React 18+, React Router v6, Tailwind, Recharts, React Hook Form, Zod, date-fns, Lucide, React Hot Toast, OpenFDA, NPPES NPI API.

---

## 1. Project overview (from doc)

- **Frontend-only** Hospital Management System (no backend server; we use JSON Server as mock API).
- **Roles:** Admin, Doctor, Receptionist, Nurse — role selection at login, stored in LocalStorage.
- **Goals:** Multi-role dashboards, simulated real-time (OPD queue, bed status, alerts), persist data via JSON Server, integrate OpenFDA + NPPES, professional UI with Tailwind.

---

## 2. User roles & access (Section 3)

| Role          | Access level              | Primary focus                          |
|---------------|---------------------------|----------------------------------------|
| Admin         | Full access               | All modules, analytics, reports        |
| Doctor        | Own patients only         | Assigned patients, prescriptions, schedule |
| Receptionist  | OPD + Appointments        | Register patients, OPD tokens, bookings |
| Nurse         | Ward + Bed management     | Bed status, vitals, ward assignments   |

**3.1 Route protection (already done in project)**  
- Custom `ProtectedRoute`; unauthorized → Access Denied (not login).  
- Sidebar shows only links for current role.  
- Navbar “Switch Account” dropdown for demo role switch.

**3.2 Login**  
- One demo account per role as clickable cards; store `{ role, name, id, avatar }` in LocalStorage; redirect to role’s default dashboard. *(Done.)*

---

## 3. Module breakdown (development order)

### Module 1 — Dashboard & analytics
- **Admin:** Total patients today, Bed occupancy (Recharts donut), OPD queue summary, Revenue (bar), Top 5 departments, Recent alerts, Doctor availability grid.  
- **Doctor:** Today’s appointments, Next patient card, Prescriptions today, Schedule summary.  
- **Receptionist:** OPD queue live, Registration count, Pending appointments, Quick actions (Register, Issue token, Book).  
- **Nurse:** Ward bed grid (color-coded), Pending vitals, Recent bed changes feed.  
*Data: RTK (queue, beds, alerts, auth, ui) + JSON Server (patients, appointments, etc.).*

### Module 2 — OPD queue
- Issue token (auto-increment, department, doctor).  
- Live queue board: current token, next 5, department-wise.  
- “Start simulation” (auto-advance e.g. every 30s), “Call next”, status badges (Waiting / In progress / Skipped / Done), Skip & re-queue, queue analytics.  
- **RTK:** `queueStore` — `queue[]`, `currentToken`, `simulationRunning`, `servedToday`. *(Structure exists; extend as needed.)*

### Module 3 — Bed & ward
- Visual bed grid (CSS grid), color by status (Available / Occupied / Reserved / Maintenance).  
- Bed detail modal, ward switcher (General, ICU, Pediatric, etc.), Admit/Discharge, bed summary, optional auto simulation (e.g. every 45s).  
- **JSON Server:** `beds` (bedId, ward, status, patientId, admittedAt, notes), `wards` (wardId, name, totalBeds, floor).  
- **RTK:** `bedStore` for live view/summary; persist in JSON Server.

### Module 4 — Patient management
- Patient list: search (name, phone, ID, blood group), filter (gender, age, department, date range), pagination.  
- Register: multi-step (Personal → Medical history → Emergency contact → Review); Patient ID like `MED-2024-XXXX`; photo as base64 in API.  
- Profile: tabs (Overview, Appointments, Prescriptions, Vitals, Billing); edit with optimistic update; soft delete.  
- **JSON Server:** `patients` (id, name, dob, gender, bloodGroup, phone, photo, etc.).

### Module 5 — Appointments
- Book: patient, department, doctor, date, slot (slots from doctor config: 15/20/30 min).  
- **Custom calendar** (date-fns, no FullCalendar): weekly grid, appointments by slot, status colors, doctor filter, reschedule (modal or optional drag).  
- **JSON Server:** `appointments` (id, patientId, doctorId, date, slot, status); `doctors` with schedule (slotDuration, lunchBreak, etc.).

### Module 6 — Prescription & OpenFDA
- Write prescription: patient, diagnosis, medicines (search via OpenFDA).  
- **OpenFDA:** drug label search (autocomplete), drug info panel, recall check (enforcement API) — show red warning if recalled.  
- Prescription builder (diagnosis, medicines, notes, follow-up), printable PDF-style view, history per patient.  
- **JSON Server:** `prescriptions` (id, patientId, doctorId, medicines[], diagnosis).

### Module 7 — Doctor directory (NPPES NPI)
- Search: NPI API (`https://npiregistry.cms.hhs.gov/api/?version=2.1`) by name, specialty, city, state.  
- Results: cards (name, NPI, specialty, address, phone); profile; pagination; filter by taxonomy.  
- “Add to internal system” → save to JSON Server `doctors`; internal list used in OPD and appointments.

### Module 8 — Reports & analytics (Admin)
- Recharts: OPD trend (30 days), Bed occupancy over time, Department distribution (pie), Appointment status (stacked bar), Doctor workload, Revenue summary, Drug recall widget.  
- Export CSV (Blob), Print-friendly CSS.

---

## 4. Data architecture (adapted for RTK + JSON Server)

### RTK (in-memory / UI state)
- **queueStore** — OPD queue, currentToken, simulationRunning, servedToday.  
- **bedStore** — Bed statuses, ward summary (can mirror/cache from API).  
- **alertStore** — Last 20 system events.  
- **authStore** — User (role, name, id) + LocalStorage sync.  
- **uiStore** — Sidebar, theme, filters.

### JSON Server (persistent)
- **patients** — id, name, dob, gender, bloodGroup, phone, photo, allergies, etc.  
- **appointments** — id, patientId, doctorId, date, slot, status.  
- **prescriptions** — id, patientId, doctorId, medicines[], diagnosis.  
- **beds** — bedId, ward, status, patientId, admittedAt, notes.  
- **wards** — wardId, name, totalBeds, floor.  
- **doctors** — id, npiNumber, name, specialty, schedule.  
- **vitals** — id, patientId, recordedAt, bp, pulse, temp, spo2.  
- **billing** — id, patientId, amount, type, date, status (simulated).

Use RTK Query or fetch to JSON Server for all CRUD; keep queue/beds/alerts simulation in RTK; optionally sync/cache from API into RTK where needed.

---

## 5. Seed data (JSON Server)

- Seed script or `db.json` with: ~20 patients, ~5 doctors, ~3 wards (e.g. 10 beds each), ~30 appointments (past + next 7 days), ~15 prescriptions, ~50 vitals, billing records.  
- Run JSON Server once; optionally “reset & re-seed” via a dev button (replace `db.json` or call a reset endpoint).

---

## 6. Challenging items (from doc)

1. **Custom calendar** — Weekly/monthly with date-fns; no calendar library.  
2. **Simulation** — Single place (e.g. hook) for queue (e.g. 30s) + bed (e.g. 45s); cleanup on unmount; global toggle in Navbar.  
3. **Multi-step registration** — React Hook Form + Zod per step; progress; final write to JSON Server.  
4. **OpenFDA recall** — Non-blocking check on drug select; red banner if recall.  
5. **Role-based layout** — Sidebar/nav per role; optional role accent colors (ROLE_CONFIG).  
6. **Patient profile** — Load patient + appointments + prescriptions + vitals from JSON Server (REST or combined endpoint).

---

## 7. Optional (from doc)

Dark mode, notification center (last 20 alerts), vitals chart in profile, drag reschedule, drug interaction warning, print prescription, keyboard shortcuts (e.g. Cmd+K), data reset + re-seed.

---

## 8. APIs (unchanged)

- **OpenFDA:** drug labels, enforcement (recall), events.  
- **NPPES NPI:** doctor search — no API key.

---

*This file is the in-mind reference for building the project part by part: RTK for state and simulation, JSON Server for all persistent data (no client-side DB libraries).*
