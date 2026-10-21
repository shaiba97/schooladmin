# Attendance build — plan + tasks

Order is dependency-ordered. Spec: `admin/tasks/attendance-spec.md`.

Owner note (2026-10-17): Attendance pages are **read-only (R only)** — no CUD UI anywhere in the admin portal. Task 5's marking block was therefore dropped; the People page was converted to a read-only viewer instead.

## todo

- [x] Task 1: Admin data layer — `admin/lib/api/attendance.ts`, `staff-attendance.ts`, `staff.ts`; types + status constants in `admin/lib/api/types.ts`; use GET /staff response shape check first
  - Acceptance: tsc clean; functions GET-only with correct query serialization
  - Verify: `npx tsc --noEmit` (admin) — 0 errors
- [x] Task 2: Admin UI — `admin/components/academics/attendance/attendance-client.tsx` (3 tabs) + SSR page replacing stub
  - Acceptance: tabs render; empty states without seed data; rate banner math mirrors profile; no write verbs
  - Verify: tsc + lint + route 200 probes (cookie) + no-write grep — all green
- [x] Task 3: Backend B1 — schema StaffMemberAttendance + migration, service fns (list/upsert with staff-role validation), controller routes GET /staff-attendance/members + POST /staff-attendance/members/entries, DTOs, Jest specs
  - Acceptance: migrate runs; POST/GET behave per spec; teacher flow untouched
  - Verify: 15/15 jest green (5 new); dist rebuilt + backend restarted (fresh PID); curl probes 200 / 404 / 400 + upsert update path confirmed (remarks cleared on re-mark)
- [x] Task 4: Seed demo data (approved): 2 student sessions w/ mixed marks; 3 teacher-days (one leftAt); 2 staff-member-days — via Daniel ADMIN JWT
  - Done: 2 sessions for class "1 CSA" (2026-10-17 + 2026-10-16, 17 records each, mixed PRESENT/LATE/ABSENT/EXCUSED with remarks); 8 teacher-week entries for 2026-10-16 (incl. PRESENT+leftAt 12:30, LEAVE, ABSENT); 2 member entries created during probes then updated via upsert update path (abdo adam → ABSENT; salah amin → PRESENT leftAt 16:45)
- [x] Task 5 (amended, R-only): People → Staff Attendance page converted to read-only viewer — entries from GET /staff-attendance (flat array) grouped by selected date, month summary cards, status badges; roster + marking UI removed per owner instruction
  - Acceptance: roster no longer broken; **no marking/save actions remain**
  - Verify: tsc 0 / eslint 0 / page 200 / "Save Attendance" absent from HTML
- [x] Task 6: Verification sweep — per-tab 200 + SSR row probes; tsc/lint; no-write grep; backend tests; DECISIONS.md entry
  - Verify: all three academics tabs 200 with SSR row content (names/leftAt/remarks/emp-no), People 200 read-only; DECISIONS.md entry recorded
