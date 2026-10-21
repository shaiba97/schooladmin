"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiSchoolClass, ApiStaffDirectoryMember, ApiStudent, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { DayAttendanceBadge, WeekendCell } from "./attendance-badges";
import { fetchWeekBundle, type AttendanceWeekBundle } from "./week-bundle";
import { addDays, applySchoolDays, dayHeaderLabel, fromDayKey, todayKey, weekTitle, weekWindow } from "./workdays";

type TabId = "students" | "teachers" | "staff";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "staff", label: "Staff" },
];

type MemberRow = { id: string; name: string; meta: string; className?: string };

type Props = {
  initialTab: TabId;
  initialWeek: string;
  initialClass?: string;
  classes: ApiSchoolClass[];
  students: ApiStudent[];
  teachers: ApiTeacher[];
  staff: ApiStaffDirectoryMember[];
  timetableEntries: ApiTimetableEntry[];
  week: AttendanceWeekBundle;
  loadError?: string;
};

function fullName(first?: string | null, middle?: string | null, last?: string | null) {
  return [first, middle, last].filter(Boolean).join(" ").trim() || "—";
}

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** memberId → (dateKey → status); duplicate entries keep the last. */
function cellMap<T extends { attendanceDate: string; status: string }>(
  entries: T[],
  keyOf: (entry: T) => string,
): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    const id = keyOf(entry);
    let perMember = map.get(id);
    if (!perMember) {
      perMember = new Map();
      map.set(id, perMember);
    }
    perMember.set(entry.attendanceDate, entry.status);
  }
  return map;
}

function studentName(s: ApiStudent) {
  return fullName(s.firstName, s.middleName, s.lastName);
}

function mondayKeyOf(key: string) {
  return addDays(key, -((fromDayKey(key).getUTCDay() + 6) % 7));
}

const STATUS_TONES: Record<string, string> = {
  PRESENT: "text-emerald-700",
  ABSENT: "text-red-700",
  LATE: "text-amber-700",
  EXCUSED: "text-sky-700",
  LEAVE: "text-sky-700",
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  LEAVE: "On leave",
};

/** Per-tab tallies plus the rate formula the spec fixes for each audience. */
function weekSummary(cells: Map<string, Map<string, string>>, columns: ReturnType<typeof weekWindow>, kind: TabId) {
  const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, LEAVE: 0 };
  for (const perMember of cells.values()) {
    for (const column of columns) {
      if (!column.isSchoolDay) continue;
      const status = perMember.get(column.dateKey);
      if (status && status in counts) counts[status] += 1;
    }
  }
  let rate: string | null = null;
  if (kind === "students") {
    const denominator = counts.PRESENT + counts.LATE + counts.ABSENT;
    rate = denominator === 0 ? null : `${Math.round((100 * (counts.PRESENT + counts.LATE)) / denominator)}%`;
  } else {
    const denominator = counts.PRESENT + counts.ABSENT;
    rate = denominator === 0 ? null : `${Math.round((100 * counts.PRESENT) / denominator)}%`;
  }
  return { counts, rate };
}

/** REGULAR non-break dayOfWeek tokens of the scope, for applySchoolDays. */
function workdayKeys(entries: ApiTimetableEntry[], classId?: string): string[] {
  const scoped = classId ? entries.filter((e) => e.classId === classId) : entries;
  return scoped.filter((e) => !e.isBreak).map((e) => e.dayOfWeek);
}

function teacherDisplayName(teacher: ApiTeacher) {
  return teacher.user
    ? fullName(teacher.user.firstName, null, teacher.user.lastName)
    : teacher.employeeNumber ?? "(unnamed teacher)";
}

/** Case-insensitive name/number/word match over visible row fields; the query never leaves the client. */
function matchesSearch(member: MemberRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${member.name} ${member.meta} ${member.className ?? ""}`.toLowerCase().includes(needle);
}

export function AttendanceWorkspaceClient(props: Props) {
  const { initialTab, initialWeek, initialClass, classes, students, teachers, staff, timetableEntries } = props;

  const [tab, setTab] = React.useState<TabId>(initialTab);
  const [weekStart, setWeekStart] = React.useState(initialWeek);
  const [classId, setClassId] = React.useState(initialClass ?? "");
  const [search, setSearch] = React.useState("");
  const [week, setWeek] = React.useState<AttendanceWeekBundle>(props.week);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(props.loadError ?? "");
  const [reloadTick, setReloadTick] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastLoaded = React.useRef(`${initialWeek}|${initialClass ?? ""}`);

  function selectTab(next: TabId) {
    setTab(next);
    setSearch("");
  }

  function clearSearch() {
    setSearch("");
    searchInputRef.current?.focus();
  }

  React.useEffect(() => {
    const key = `${weekStart}|${classId}`;
    if (lastLoaded.current === key) return;
    lastLoaded.current = key;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchWeekBundle(weekStart, classId || undefined)
      .then((bundle) => {
        if (cancelled) return;
        setWeek(bundle);
        setError(bundle.failures.length > 0 ? `Unable to load ${bundle.failures.join(", ")} — showing what loaded.` : "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Attendance data could not be loaded.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart, classId, reloadTick]);

  // Live oversight: whenever any attendance is recorded anywhere (class,
  // school-wide mirrors), the matrix refetches without a manual reload.
  useRealtimeEvent(["attendance.marked", "attendance_updated"], {
    onEvent: () => {
      lastLoaded.current = "";
      setReloadTick((tick) => tick + 1);
    },
    onReconnect: () => {
      lastLoaded.current = "";
      setReloadTick((tick) => tick + 1);
    },
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    if (weekStart === initialWeek) params.delete("week");
    else params.set("week", weekStart);
    if (classId) params.set("class", classId);
    else params.delete("class");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [tab, weekStart, classId, initialWeek]);

  const columns = React.useMemo(
    () => applySchoolDays(weekWindow(weekStart), workdayKeys(timetableEntries, classId)),
    [weekStart, timetableEntries, classId],
  );

  const studentCells = React.useMemo(() => cellMap(week.rows, (r) => r.studentId), [week.rows]);
  const teacherCells = React.useMemo(() => cellMap(week.teacherEntries, (e) => e.teacherId), [week.teacherEntries]);
  const staffCells = React.useMemo(() => cellMap(week.memberEntries, (e) => e.userId), [week.memberEntries]);

  const studentRoster: MemberRow[] = React.useMemo(() => {
    const scopedClassName = classId ? (classes.find((c) => c.id === classId)?.className ?? "") : "";
    return students
      .filter((s) => !classId || s.enrollments?.some((e) => e.status === "ACTIVE" && e.schoolClass?.id === classId))
      .map((s) => {
        const active = s.enrollments?.find((e) => e.status === "ACTIVE" && e.schoolClass);
        return {
          id: s.id,
          name: studentName(s),
          meta: s.roleNumber ?? "",
          className: classId ? scopedClassName : active?.schoolClass?.className,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classId, students, classes]);

  const teacherRoster: MemberRow[] = React.useMemo(
    () =>
      teachers
        .map((t) => ({ id: t.id, name: teacherDisplayName(t), meta: t.employeeNumber ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teachers],
  );

  const staffRoster: MemberRow[] = React.useMemo(
    () =>
      staff
        .map((m) => ({
          id: m.id,
          name: fullName(m.firstName, null, m.lastName),
          meta: [m.positionTitle ?? m.position ?? "", m.staffNumber ?? ""].filter(Boolean).join(" · "),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff],
  );

  const roster = tab === "students" ? studentRoster : tab === "teachers" ? teacherRoster : staffRoster;
  const filteredRoster = React.useMemo(() => roster.filter((m) => matchesSearch(m, search)), [roster, search]);
  const activeCells = tab === "students" ? studentCells : tab === "teachers" ? teacherCells : staffCells;
  const detailType = tab === "students" ? "student" : tab === "teachers" ? "teacher" : "staff";
  const totals = React.useMemo(() => weekSummary(activeCells, columns, tab), [activeCells, columns, tab]);

  const perDayCounts = React.useMemo(
    () =>
      columns.map((column) => {
        const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, LEAVE: 0 };
        if (column.isSchoolDay) {
          for (const perMember of activeCells.values()) {
            const status = perMember.get(column.dateKey);
            if (status && status in counts) counts[status] += 1;
          }
        }
        return { column, counts };
      }),
    [columns, activeCells],
  );

  const thisWeekMonday = mondayKeyOf(todayKey());
  function shiftWeekLabel(interval: number) {
    setWeekStart(addDays(weekStart, interval));
  }

  const headerStatusOrder = tab === "students" ? ["PRESENT", "LATE", "ABSENT", "EXCUSED"] : ["PRESENT", "LEAVE", "ABSENT"];
  const emptyMessage =
    search.trim()
      ? "No members match your search."
      : tab === "students" && classId
        ? "No active students enrolled in this class."
        : "No members to display yet.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Week of {weekTitle(columns) || weekStart}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => shiftWeekLabel(-7)} aria-label="Previous week">
            <ChevronLeft size={15} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(thisWeekMonday)} aria-label="Jump to the current week" disabled={weekStart === thisWeekMonday}>
            <CalendarDays size={14} className="mr-1.5" />
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftWeekLabel(7)} aria-label="Next week">
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Attendance audience" className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-ring ${
              tab === t.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="workspace-search" className="text-muted-foreground">Search</label>
        <div className="relative">
          <input
            ref={searchInputRef}
            id="workspace-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") clearSearch();
            }}
            placeholder="Search by name or number…"
            aria-controls="attendance-matrix"
            className="h-9 w-56 rounded-md border border-input bg-transparent pl-2.5 pr-8 text-sm placeholder:text-muted-foreground/60 focus-visible:outline focus-visible:outline-ring"
          />
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-ring"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        {search ? (
          <span aria-live="polite" className="text-xs text-muted-foreground">
            {filteredRoster.length} of {roster.length} shown
          </span>
        ) : null}
        {tab === "students" ? (
          <>
            <label htmlFor="workspace-class" className="text-muted-foreground">Class</label>
            <select
              id="workspace-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </>
        ) : null}
        {loading ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      {(error || props.loadError) && !loading ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || props.loadError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tab === "students" ? (
          <>
            <SummaryCard label="Present" value={totals.counts.PRESENT} tone={STATUS_TONES.PRESENT} />
            <SummaryCard label="Late" value={totals.counts.LATE} tone={STATUS_TONES.LATE} />
            <SummaryCard label="Absent" value={totals.counts.ABSENT} tone={STATUS_TONES.ABSENT} />
            <SummaryCard label="Excused" value={totals.counts.EXCUSED} tone={STATUS_TONES.EXCUSED} />
          </>
        ) : (
          <>
            <SummaryCard label="Present" value={totals.counts.PRESENT} tone={STATUS_TONES.PRESENT} />
            <SummaryCard label="On leave" value={totals.counts.LEAVE} tone={STATUS_TONES.LEAVE} />
            <SummaryCard label="Absent" value={totals.counts.ABSENT} tone={STATUS_TONES.ABSENT} />
          </>
        )}
        <SummaryCard label="Rate" value={totals.rate ?? "—"} tone="" />
      </div>

      <MatrixTable
        roster={filteredRoster}
        cells={activeCells}
        perDayCounts={perDayCounts}
        headerStatusOrder={headerStatusOrder}
        detailType={detailType}
        loading={loading}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-2.5">
      <p className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MatrixTable({
  roster,
  cells,
  perDayCounts,
  headerStatusOrder,
  detailType,
  loading,
  emptyMessage,
}: {
  roster: MemberRow[];
  cells: Map<string, Map<string, string>>;
  perDayCounts: Array<{ column: ReturnType<typeof weekWindow>[number]; counts: Record<string, number> }>;
  headerStatusOrder: string[];
  detailType: "student" | "teacher" | "staff";
  loading: boolean;
  emptyMessage: string;
}) {
  if (roster.length === 0) {
    return (
      <div id="attendance-matrix" className="overflow-hidden rounded-lg border bg-card">
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }
  return (
    <div id="attendance-matrix" className={`overflow-hidden rounded-lg border bg-card ${loading ? "pointer-events-none opacity-60" : ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th scope="col" className="min-w-[15rem] px-4 py-2.5 text-left font-medium text-muted-foreground">Member</th>
              {perDayCounts.map(({ column, counts }) => (
                <th
                  key={column.dateKey}
                  scope="col"
                  aria-current={column.isToday ? "date" : undefined}
                  className={`whitespace-nowrap px-2.5 py-2.5 text-center font-medium ${
                    column.isToday ? "bg-primary/5 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div className="text-xs">
                    {dayHeaderLabel(column)}
                    {column.isToday ? <span className="ml-1.5 rounded bg-primary/10 px-1 text-[10px] font-semibold">today</span> : null}
                  </div>
                  <div className="mt-0.5 text-[10px] tabular-nums">
                    {column.isSchoolDay
                      ? headerStatusOrder
                          .filter((status) => counts[status] > 0)
                          .map((status) => (
                            <span key={status} className={`mr-1.5 ${STATUS_TONES[status]}`}>
                              {counts[status]} {STATUS_LABELS[status]?.toLowerCase()}
                            </span>
                          ))
                      : <span className="text-muted-foreground/60">—</span>}
                  </div>
                </th>
              ))}
              <th scope="col" className="w-16 px-3 py-2.5 text-right font-medium text-muted-foreground">
                <span className="sr-only">View log</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roster.map((member) => (
              <tr key={`${detailType}-${member.id}`} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {initialsOf(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {detailType === "student" ? [member.meta, member.className].filter(Boolean).join(" · ") : member.meta || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                {perDayCounts.map(({ column }) => {
                  if (!column.isSchoolDay) {
                    return (
                      <td key={column.dateKey} className="px-2.5 py-2 text-center">
                        <WeekendCell />
                      </td>
                    );
                  }
                  const status = cells.get(member.id)?.get(column.dateKey) ?? null;
                  return (
                    <td key={column.dateKey} className="px-2.5 py-2 text-center">
                      <DayAttendanceBadge status={status} />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/academic/attendance/${member.id}?type=${detailType}`}
                    className="inline-flex items-center rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-ring"
                    aria-label={`Open ${member.name}'s attendance log`}
                  >
                    <FileText size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
