# Attendance Workspace — implementation plan

Spec: `attendance-workspace-spec.md`. Order is dependency-driven; R-only throughout.

## Tasks

### Phase 1 — Backend foundation
- [x] Task 1: Matrix Jest spec (TDD red) — attendance.service.spec.ts: range clip, class filter, shape/order, tenant filter
- [x] Task 2: Implement `listMatrix` + `GET /attendance/matrix` (DTO validation) → jest green (12/12)
  - Checkpoint: build + restart + live probes — 34 seeded rows/2 days, 400 inverted+bad dates, class filter 200

### Phase 2 — Admin data layer
- [x] Task 3: `listAttendanceMatrix` in admin/lib/api/attendance.ts; tsc gate

### Phase 3 — UI foundations
- [x] Task 4: `workdays.ts` (week window math, `applySchoolDays` after doubt-cycle hardening, labels) + `attendance-badges.tsx` primitives
  - Checkpoint: tsc

### Phase 4 — Workspace page
- [x] Task 5: SSR page rewrite (prefetch classes/timetable REGULAR/teachers/staff/students + shared `fetchWeekBundle`) + `attendance-workspace-client.tsx` (3 tabs, week nav, class filter, badges, log links); old `attendance-client.tsx` + `status-badges.tsx` deleted
  - Checkpoint: tsc/eslint + SSR probes 200 w/ seed rows + weekend placeholders

### Phase 5 — Detail page
- [x] Task 6: `attendance/[id]/page.tsx` SSR + `attendance-detail-client.tsx` (month stats, calendar grid with school-day masking, lifetime table + status filter)
  - Checkpoint: tsc/eslint + SSR probes 200 on all three types

### Phase 6 — Close-out
- [x] Task 7: Verification sweep (no-write grep clean, dead modules removed, probe sweep) + `_1uomf` root cause: staff/teacher `attendanceDate` serialized as full ISO — normalized via `dateKeyOf` in `week-bundle` + detail page

## Risks
| Risk | Mitigation |
|---|---|
| Stale server hosting old dist | kill PID on :3000 before restart (recurring issue) |
| Date boundary confusion (local UTC+5 vs stored midnight) | all date strings passed as plain YYYY-MM-DD; never `new Date(y,m,d)` comparisons |
| Empty timetable scopes → zero school days | fallback: render full 7-day week, no Weekend placeholders |
| Lifetime rows growth for staff/teacher lists | client-side week filter; acceptable at current scale, noted for follow-up |
