# URL query string and list filters

This document explains how MediCare HMS keeps **filters, pagination, and related UI state** in the **browser URL** (query string) so links are **shareable**, **bookmarkable**, and the **back/forward** buttons behave predictably.

## Package or manual?

| Approach | What we use |
|----------|-------------|
| **Extra npm package** (e.g. `nuqs`, `use-query-params`) | **Not used** for this feature. |
| **Built-in React Router API** | **`useSearchParams`** from `react-router-dom` (already a project dependency, see `package.json`). |
| **Project helper** | **`useMergeSearchParams`** — a thin wrapper around `useSearchParams` so pages can **merge** partial updates without dropping unrelated query keys. |

So: **no additional package** was added for URL filters. The implementation is **manual in the sense of hand-written app code**, but it **delegates to the official router** for parsing and updating the URL.

### Why not add another package?

- `react-router-dom` v6/v7 already exposes `useSearchParams` and a functional updater that matches our merge pattern.
- Fewer dependencies, smaller surface area, and behavior stays aligned with how the rest of the app navigates.

If you later want stricter typing, parsers (numbers, enums), or middleware, you can still introduce a library **on top of** the same hook or replace the hook’s internals without changing every page’s query key names.

---

## Core API: `useMergeSearchParams`

**File:** `src/shared/hooks/useMergeSearchParams.ts`

```ts
const { searchParams, merge } = useMergeSearchParams()
```

- **`searchParams`** — A `URLSearchParams` instance for the **current** location (read-only usage from the caller’s perspective).
- **`merge(updates)`** — Applies **partial** changes:
  - `string` / `number` / `boolean` → `set(key, String(value))`
  - `null` / `undefined` / `''` → **deletes** the key (so defaults can apply in the page’s own logic).

Updates use **`replace: true`** so filter tweaks do not flood the browser history with one entry per keystroke when that would be undesirable (same as typical “filter in URL” behavior).

**Implementation detail:** `merge` calls `setSearchParams((prev) => { ... })` so each update **starts from the latest** query string and does not accidentally wipe keys it is not touching.

---

## Where it is used (query keys by route)

These are **conventions** agreed by each page; there is no global registry in code beyond this doc and the call sites.

| Route / page | Query keys | Notes |
|--------------|------------|--------|
| **Patient list** (`PatientListPage`) | `q`, `blood`, `gender`, `ageMin`, `ageMax`, `regFrom`, `regTo`, `dept`, `page` | `q` = search text. Empty / “all” values are usually **omitted** from the URL. `page` is 1-based; omitted often means page 1. |
| **Prescriptions** (`PrescriptionsPage`) | `patient`, `tab`, `q`, `status` | `patient` pre-fills “New prescription”. `tab` = `new` \| `history`. `status` omitted = all. On successful save from new Rx, code clears **`patient`** and sets **`tab=history`** while leaving `q` / `status` if present. |
| **Doctor · My patients** (`DoctorMyPatientsPage`) | `q`, `page` | Search + pagination. |
| **Vitals entry** (`VitalsEntryPage`) | `q`, `page`, `size` | `size` = rows per page (allowed values match the UI). Default row count often omits `size` in the URL. |
| **Appointments** (`AppointmentsPage`) | `week`, `doctor` | `week` = Monday of the visible week as **`yyyy-MM-dd`**. `doctor` = selected schedule doctor id when the layout is not **locked** to the logged-in doctor. |
| **Doctor directory** (`DoctorDirectoryPage`) | `tab`, `page` | `tab=internal` selects internal HMS doctors; omitted = NPI search tab. `page` = NPI result page index (0-based); omitted often means 0. |

Other pages may still use **`useSearchParams`** directly (e.g. profile tabs, vitals detail `record=1`) without going through `merge`; that is intentional when only a tiny amount of state is needed.

---

## Example URLs

```text
/admin/patients?q=Patel&blood=A%2B&gender=male&page=2

/doctor/prescriptions?tab=history&q=med&status=active

/doctor/patients?q=cardio&page=1

/nurse/vitals?q=980&size=20&page=2

/admin/schedule?week=2026-04-13&doctor=<schedule-doctor-id>
```

(Exact path prefixes depend on your router layout; keys are what matter.)

---

## For developers: adding a new filter to a page

1. Import `useMergeSearchParams` from `src/shared/hooks/useMergeSearchParams.ts`.
2. **Read** with `searchParams.get('myKey') ?? ''` (or your default).
3. **Write** with `merge({ myKey: value, page: null })` if changing a filter should reset pagination—same pattern as existing pages.
4. Prefer **short, stable** key names and document them here.
5. Avoid storing large blobs or PII you would not want in server logs / referrals; the query string is visible in the address bar and in HTTP `Referer` in some setups.

---

## Related files

| File | Role |
|------|------|
| `src/shared/hooks/useMergeSearchParams.ts` | Shared merge helper |
| `src/pages/PatientListPage.tsx` | Patient registry filters + page |
| `src/pages/PrescriptionsPage.tsx` | Rx tab, search, status, `patient` prefill |
| `src/pages/DoctorMyPatientsPage.tsx` | Search + page |
| `src/pages/VitalsEntryPage.tsx` | Search, page size, page |
| `src/pages/AppointmentsPage.tsx` | Week + doctor picker |
| `src/pages/DoctorDirectoryPage.tsx` | Directory tab + NPI results page |

---

## Summary

| Question | Answer |
|----------|--------|
| Extra npm package for query filters? | **No** |
| What powers the URL? | **`react-router-dom`** → `useSearchParams` |
| Custom code? | **`useMergeSearchParams`** helper + per-page reads/writes |
| Why? | One consistent pattern, shareable URLs, no new dependency |
