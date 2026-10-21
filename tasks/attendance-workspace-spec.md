# Spec: Attendance Workspace & Detail Views (admin portal)

## Objective
Replace the previous 3-tab attendance viewer with a proper **Attendance Workspace**:
1. `attendance/page.tsx` — 3 tabs (Students / Teachers / Staff), each a week matrix with dynamic school-day
   columns driven by the school's real timetable, week navigation, per-day status badges, and a
   `View Attendance Log` action per member.
2. `attendance/[id]/page.tsx` — per-member detail: personal card + month summary stats + current-month
   calendar log + filterable lifetime history.
Strictly **read-only (R-only)** — no CUD UI in the admin portal (standing owner directive).

Prompt vocabulary → real paths: `app/(dashboard)/admin/attendance[/id]` →
`admin/app/(portal)/academic/attendance[/[id]]` (sidebar keeps pointing at `/academic/attendance`).

## Assumptions (surfaced & approved by owner)
1. Route stays `/academic/attendance` (+ new `/academic/attendance/[id]`).
2. A new backend range endpoint `GET /attendance/matrix` powers the Students week matrix (approved).
3. School days are derived from timetable data — no fabricated weekend config (approved).

## Data contracts (all GET-only)

### Backend (new, additive)
`GET /attendance/matrix?from=YYYY-MM-DD&to=YYYY-MM-DD&classId=<uuid>?`
 — roles ADMIN/ACADEMIC_ADMIN/TEACHER (class-level guard), tenant-scoped read.
Response `rows[]`: `{ attendanceDate, classId, className, studentId, studentName, rollNumber,
status, remarks }`, ordered `attendanceDate asc → className asc → studentName asc`.

### Existing endpoints consumed
- Students week matrix: new matrix endpoint (one request per week+class scope).
- Teachers: `GET /staff-attendance` (omit `month` → lifetime rows; `include teacher {employeeNumber, user}`).
- Staff: `GET /staff-attendance/members` (omit `month` → lifetime; `include user {staffNumber}`).
- Student history: `GET /students/:id/attendance-records` (lifetime; rows carry session date via
  `attendanceSession.attendanceDate`).
- Member cards: `GET /students/:id`, `GET /teachers/:id`, `GET /staff/:id`.
- Workdays: `GET /timetable/class/:classId?timetableType=REGULAR` (class-scoped, Students tab) and
  `GET /timetable` (tenant-wide REGULAR rows, Teachers/Staff tabs); classes list for the filter.

## Business rules
- **Status vocabulary:** students `PRESENT|ABSENT|LATE|EXCUSED`; teachers/staff `PRESENT|ABSENT|LEAVE`
  (+ `leftAt` HH:MM = check-outwhere recorded).
- **Badge colors:** PRESENT → green + check; ABSENT → red; LATE → amber; EXCUSED/LEAVE → blue;
  no record on a school day → muted `-`; non-school day → gray `Weekend` placeholder column cells.
- **Workday derivation:** school days = distinct `dayOfWeek` values with ≥1 non-break REGULAR timetable
  entry for the scope (class-scoped per selected class on Students; tenant-wide on Teachers/Staff).
  Fallback if a scope has NO timetable rows: render all 7 calendar days, skip Weekend placeholders.
- **Week navigation:** 7-day calendar windows (Mon→Sun basis), `± 7 days` per click; label shows
  `Oct 12 – Oct 16, 2026` across the first→last *school* day in view (full span fallback). Future weeks
  render all `-` but remain navigable. All label components use UTC getters; "today" is the local
  wall-calendar day (recomputed per render).
- **Month stats (detail page, active month):**
  - Students: presents = PRESENT+LATE; absents = ABSENT; late = LATE; rate = (PRESENT+LATE)/(total−EXCUSED), `—` when denominator 0.
  - Teachers/staff: rate = PRESENT/(total−LEAVE), `—` when denominator 0.
- **Check-in:** no check-in stamps exist in any model → Check-in column renders `—` honestly;
  Check-out = `leftAt` when present (teachers/staff only).

## Commands
- Backend tests: `cmd /c "npx jest src/attendance --silent"` (via `backend/`)
- Backend build: `cmd /c "npm run build"` (via `backend/`); restart via `run-backend.cmd` (kill stale node holding :3000 first)
- Admin: `cmd /c "npx tsc --noEmit"`, `cmd /c "npx eslint app/(portal)/academic/attendance*"` (via `admin/`)
- SSR probe: real-cookie curl on `http://localhost:5400` (`ad_token` minted via temp mint.js)

## Project Structure (files this build creates/edits)
```
backend/src/attendance/attendance.controller.ts     → +matrix route
backend/src/attendance/attendance.service.ts        → +listMatrix
backend/src/attendance/attendance.service.spec.ts   → +matrix tests (written FIRST)
admin/lib/api/attendance.ts                         → +listAttendanceMatrix
admin/components/academics/attendance/workdays.ts   → week window + school-day derivation utils
admin/components/academics/attendance/attendance-badges.tsx → badge primitives (absorbs status-badges.tsx)
admin/components/academics/attendance/attendance-workspace-client.tsx → replaces attendance-client.tsx
admin/components/academics/attendance/attendance-detail-client.tsx   → new
admin/app/(portal)/academic/attendance/page.tsx     → rewritten SSR workspace page
admin/app/(portal)/academic/attendance/[id]/page.tsx → new SSR detail page
```

## Boundaries
- **Always:** TDD for the backend route; tenant scoping in every query; tsc+lint gates; no-write grep before sign-off.
- **Ask first:** any schema change, new dependency, or new frontend package.
- **Never:** write verbs in admin attendance UIs; fabricated check-in data; hard-coded weekend overrides.

## Success criteria
1. `npx jest src/attendance` and `src/staff-attendance` suites green (matrix tests included).
2. Backend dist rebuilt + fresh server; live probes: matrix 200 with seeded rows, 400 bad dates, 403 wrong role.
3. Workspace renders per tab with SSR-first-paint rows (seeded 2026-10 week data), Weekend placeholders on non-school days, class filter works on Students.
4. `View Attendance Log` navigates to `[id]?type=…` and the detail card shows correct member identity + month stats from seeded rows.
5. tsc/eslint clean; no write verbs in any new/changed admin attendance file; status filter works on lifetime tables.
6. DECISIONS.md entry + plan checkboxes updated.
