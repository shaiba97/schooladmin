# Spec: Admin Attendance (student-wise / teacher-wise / staff-wise)

## Objective
Replace the `/academic/attendance` placeholder with a read-only admin Attendance section backed by the real Nest attendance modules, covering three dimensions confirmed by the owner:
- **Student-wise** — `AttendanceSession`/`AttendanceRecord` (statuses PRESENT/ABSENT/LATE/EXCUSED)
- **Teacher-wise** — existing `StaffAttendance` (one row per teacher/day; PRESENT/ABSENT/LEAVE, leftAt, remarks)
- **Staff-wise** — **non-teaching staff** defined as role slugs `RECEPTIONIST`, `ACADEMIC_ADMIN`, `ACCOUNTANT` (system positions), `PRINCIPAL`, `JANITOR`, `LIBRARIAN` (operational), and `CUSTOM_*` roles. Backend currently cannot track them → new parallel model `StaffMemberAttendance` keyed `(tenantId, userId, attendanceDate)` (option B1), teacher flow untouched.

Success = all three tabs render real server-fetched data (seeded), 200 routes behind the cookie gate, zero write verbs in admin academic code except pre-existing People pages, backend tests green after the B1 extension, and the pre-existing People → Staff Attendance roster bug fixed.

## Commands
- Admin dev: `npm run dev` (port 5400, workdir `admin/`)
- Admin typecheck: `npx tsc --noEmit` (workdir `admin/`) — must be 0 errors
- Admin lint: `npm run lint` — 0 errors (3 pre-existing warnings OK)
- Backend tests: `npx jest src/staff-attendance src/attendance` (workdir `backend/`)
- Backend dev: `run-backend.cmd` on :3000 (PID-managed; rebuild dist after schema/controller changes per repo convention)
- Prisma: check `backend/prisma/migrations` convention before migrating; `scripts/sync-prisma-schema-hash.mjs` exists

## Project Structure (new code only)
- `admin/lib/api/attendance.ts` — GET-only: listTodaySessions, getSessionForClassDate, getAttendanceSession
- `admin/lib/api/staff-attendance.ts` — GET-only: listTeacherAttendance({month?, teacherId?}), listStaffMemberAttendance({month?, userId?})
- `admin/lib/api/staff.ts` — GET-only: listStaff() (directory, roles ADMIN/SYSTEM_ADMIN)
- `admin/components/academics/attendance/` — attendance-client.tsx (+ roster/history panels inline), no write hooks
- `admin/app/(portal)/academic/attendance/page.tsx` — SSR server page (Promise.allSettled pattern)
- `backend/prisma/schema.prisma` — StaffMemberAttendance model + User/Tenant relation arrays
- `backend/src/staff-attendance/` — member DTOs, service fns, controller routes `GET /staff-attendance/members`, `POST /staff-attendance/members/entries`

## Code Style
Mirror existing conventions: `adminApiFetch` for GET libs, academicErrorMessage from `@/lib/format`, badge superset for status colors, `params: Promise<…>` awaited in server pages, no comments unless structurally needed (per AGENTS).

## Testing Strategy
- Backend: new Jest specs for member upsert/list (happy path + tenant validation + month validation), run with existing staff-attendance/attendance suites.
- Admin: route sweep 200 + SSR content probes with real cookie; tsc/lint; no-write grep over new admin files.

## Boundaries
- Always: keep admin academic section read-only (GET verbs only in new admin libs); tenant-scope all queries; await Next `params/searchParams` promises.
- Ask first: destructive DB ops (none planned); further schema changes beyond StaffMemberAttendance.
- Never: port the student/teacher marking write flows into the academic admin section; mock data; secrets in code.

## Success Criteria
1. `/academic/attendance` renders 3 tabs; SSR first paint carries live rows where data exists.
2. Seeded demo data visible: ≥2 student sessions with mixed marks, ≥3 teacher-day rows (one with leftAt), ≥2 staff-member-day rows.
3. People → Staff Attendance roster loads from `GET /teachers` (bug fixed), plus staff-member daily marking block functioning via `POST /staff-attendance/members/entries`.
4. Backend jest suites (staff-attendance + attendance + new member specs) all green.
5. tsc 0; admin lint 0 errors; no-write grep clean for `admin/components/academics/attendance/*` and new lib files.
6. DECISIONS.md entry recorded.

## Resolved decisions (owner-approved)
- Staff = non-teaching directory roles (definition above); tracking implemented via parallel model B1.
- Demo data seeding approved (2 class-dates, 3 teacher-days, 2 staff-days).
- Pre-existing People page roster bug fixed in this scope.
