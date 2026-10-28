"use client";

import * as React from "react";
import {
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  History,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UserRoundX,
  Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  listTeacherAttendance,
  listStaffMemberAttendance,
  upsertStaffMemberAttendance,
  upsertTeacherAttendance,
} from "@/lib/api/staff-attendance";
import type {
  ApiStaffAttendanceEntry,
  ApiStaffDirectoryMember,
  ApiStaffMemberAttendanceEntry,
  ApiTeacher,
  StaffMemberAttendanceStatusId,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";
import { useRealtimeEvent } from "@/lib/realtime/socket";

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const ROSTER_STATUSES: StaffMemberAttendanceStatusId[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "PERMITTED",
  "LEAVE",
];

const STATUS_META: Record<StaffMemberAttendanceStatusId, { label: string; variant: BadgeVariant }> = {
  PRESENT: { label: "Present", variant: "success" },
  LATE: { label: "Late", variant: "warning" },
  ABSENT: { label: "Absent", variant: "destructive" },
  PERMITTED: { label: "Excused", variant: "info" },
  LEAVE: { label: "On leave", variant: "info" },
};

type EntryStatus = StaffMemberAttendanceStatusId | string;

type RosterRow = {
  key: string;
  kind: "teacher" | "member";
  refId: string;
  name: string;
  idNumber: string;
  department: string;
  status: EntryStatus | null;
  leftAt: string | null;
  remarks: string | null;
  updatedAt: string | null;
};

type DayEntry = Pick<
  ApiStaffAttendanceEntry | ApiStaffMemberAttendanceEntry,
  "status" | "leftAt" | "remarks" | "attendanceDate"
>;

function localIsoDate(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthOf(value: string) {
  return value.slice(0, 7);
}

function addMonths(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, mon - 1, 1)));
}

function dayDateLabel(dayKey: string) {
  const [year, mon, day] = dayKey.split("-").map(Number);
  return DAY_MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, mon - 1, day)));
}

function statusMeta(status: EntryStatus | null) {
  if (!status) return { label: "Not marked", variant: "muted" as BadgeVariant };
  return (
    STATUS_META[status as StaffMemberAttendanceStatusId] ?? {
      label: status,
      variant: "muted" as BadgeVariant,
    }
  );
}

const PRESENCE_STATUSES = ["PRESENT", "LATE"];

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

type HistoryRecord = {
  date: string;
  status: EntryStatus;
  leftAt: string | null;
  remarks: string | null;
};

export function StaffAttendanceClient({
  initialTeachers,
  initialMembers,
  initialTeacherEntries,
  initialMemberEntries,
  initialMonth,
  initialError,
}: {
  initialTeachers: ApiTeacher[];
  initialMembers: ApiStaffDirectoryMember[];
  initialTeacherEntries: ApiStaffAttendanceEntry[];
  initialMemberEntries: ApiStaffMemberAttendanceEntry[];
  initialMonth: string;
  initialError: string;
}) {
  const [month, setMonth] = React.useState(initialMonth);
  const [teacherEntries, setTeacherEntries] = React.useState(initialTeacherEntries);
  const [memberEntries, setMemberEntries] = React.useState(initialMemberEntries);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [department, setDepartment] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [mutatingKey, setMutatingKey] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState("");
  const [bulkBusy, setBulkBusy] = React.useState<null | "mark" | "export" | "leave">(null);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [leaveQuery, setLeaveQuery] = React.useState("");
  const [savingLeaveKey, setSavingLeaveKey] = React.useState<string | null>(null);
  const [historyKey, setHistoryKey] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<HistoryRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const [selectedDay, setSelectedDay] = React.useState(() => localIsoDate());

  // Realtime: any school-wide attendance broadcast refreshes the month view.
  const [realtimeTick, setRealtimeTick] = React.useState(0);
  useRealtimeEvent(["attendance_updated"], {
    onEvent: () => setRealtimeTick((tick) => tick + 1),
    onReconnect: () => setRealtimeTick((tick) => tick + 1),
  });
  React.useEffect(() => {
    if (realtimeTick === 0) return;
    void refreshMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeTick]);

  const dayEntriesByRef = React.useMemo(() => {
    const teacherById = new Map<string, DayEntry>();
    for (const entry of teacherEntries) {
      if (String(entry.attendanceDate).slice(0, 10) === selectedDay) {
        teacherById.set(entry.teacherId, entry);
      }
    }
    const memberById = new Map<string, DayEntry>();
    for (const entry of memberEntries) {
      if (String(entry.attendanceDate).slice(0, 10) === selectedDay) {
        memberById.set(entry.userId, entry);
      }
    }
    return { teacherById, memberById };
  }, [teacherEntries, memberEntries, selectedDay]);

  const roster: RosterRow[] = React.useMemo(() => {
    const rows: RosterRow[] = [];
    for (const teacher of initialTeachers) {
      if ((teacher.status ?? "").toUpperCase() !== "ACTIVE") continue;
      const entry = dayEntriesByRef.teacherById.get(teacher.id);
      rows.push({
        key: `teacher:${teacher.id}`,
        kind: "teacher",
        refId: teacher.id,
        name:
          `${teacher.user?.firstName ?? ""} ${teacher.user?.lastName ?? ""}`.trim() ||
          "Unnamed teacher",
        idNumber: teacher.employeeNumber ?? "-",
        department: teacher.department?.name ?? "Unassigned",
        status: entry?.status ?? null,
        leftAt: entry?.leftAt ?? null,
        remarks: entry?.remarks ?? null,
        updatedAt: null,
      });
    }
    for (const member of initialMembers) {
      if ((member.status ?? "").toUpperCase() === "DELETED") continue;
      const entry = dayEntriesByRef.memberById.get(member.id);
      rows.push({
        key: `member:${member.id}`,
        kind: "member",
        refId: member.id,
        name: `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Unnamed staff",
        idNumber: member.staffNumber ?? "-",
        department: member.positionTitle ?? member.position ?? "Administration",
        status: entry?.status ?? null,
        leftAt: entry?.leftAt ?? null,
        remarks: entry?.remarks ?? null,
        updatedAt: null,
      });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [initialTeachers, initialMembers, dayEntriesByRef]);

  const departmentOptions = React.useMemo(
    () =>
      [...new Set(roster.map((row) => row.department))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [roster],
  );

  const filtersActive = Boolean(query.trim()) || department !== "all" || statusFilter !== "all";

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roster.filter((row) => {
      if (department !== "all" && row.department !== department) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "unmarked" ? row.status !== null : row.status !== statusFilter) {
          return false;
        }
      }
      if (!needle) return true;
      return `${row.name} ${row.idNumber} ${row.department}`.toLowerCase().includes(needle);
    });
  }, [roster, query, department, statusFilter]);

  const totals = React.useMemo(() => {
    const byStatus = (statuses: EntryStatus[]) =>
      roster.filter((row) => row.status && statuses.includes(row.status)).length;
    const present = byStatus(["PRESENT"]);
    const late = byStatus(["LATE"]);
    const absent = byStatus(["ABSENT"]);
    const permitted = byStatus(["PERMITTED"]);
    const leave = byStatus(["LEAVE"]);
    return { present, late, absent, permitted, leave };
  }, [roster]);

  const markedCount = roster.filter((row) => row.status !== null).length;
  const presentPct =
    roster.length > 0 ? Math.round(((totals.present + totals.late) / roster.length) * 100) : 0;

  const trendData = React.useMemo(() => {
    const total = roster.length;
    const perDayMarked = new Map<number, { present: number; late: number }>();
    for (const entry of [...teacherEntries, ...memberEntries]) {
      const dateIso = String(entry.attendanceDate).slice(0, 10);
      if (monthOf(dateIso) !== month) continue;
      const day = Number(dateIso.slice(8, 10));
      const bucket = perDayMarked.get(day) ?? { present: 0, late: 0 };
      if (entry.status === "PRESENT") bucket.present += 1;
      else if (entry.status === "LATE") bucket.late += 1;
      perDayMarked.set(day, bucket);
    }
    const limit = daysInMonth(month);
    const now = new Date();
    const isCurrentMonth = month === monthOf(localIsoDate(now));
    const today = isCurrentMonth ? now.getDate() : limit;
    const rows = [];
    for (let day = 1; day <= Math.min(today, limit); day += 1) {
      const bucket = perDayMarked.get(day);
      if (!bucket || total === 0) continue;
      rows.push({
        day: `D${day}`,
        rate: Math.round(((bucket.present + bucket.late) / total) * 100),
      });
    }
    return rows;
  }, [month, teacherEntries, memberEntries, roster.length]);

  const departmentChartData = React.useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    for (const row of roster) {
      if (!row.status) continue;
      const bucket = map.get(row.department) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (PRESENCE_STATUSES.includes(row.status as string)) bucket.present += 1;
      map.set(row.department, bucket);
    }
    return [...map.entries()]
      .map(([name, bucket]) => ({
        department: name,
        rate: bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0,
        marked: bucket.total,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [roster]);

  const monthMin = addMonths(monthOf(localIsoDate()), -12);
  const canGoNext = month < monthOf(localIsoDate());
  const trendConfig = {
    rate: { label: "Presence rate", color: "#10b981" },
  } satisfies ChartConfig;

  const departmentConfig = {
    rate: { label: "Present", color: "#14b8a6" },
  } satisfies ChartConfig;

  async function loadMonth(targetMonth: string) {
    const [teacherRows, memberRows] = await Promise.all([
      listTeacherAttendance({ month: targetMonth }),
      listStaffMemberAttendance({ month: targetMonth }),
    ]);
    setTeacherEntries(teacherRows);
    setMemberEntries(memberRows);
  }

  async function refreshMonth(nextMonth?: string) {
    const target = nextMonth ?? month;
    setRefreshing(true);
    setRefreshError("");
    try {
      await loadMonth(target);
      setMonth(target);
      if (monthOf(selectedDay) !== target) {
        setSelectedDay(target === monthOf(localIsoDate()) ? localIsoDate() : `${target}-01`);
      }
    } catch (cause) {
      setRefreshError(academicErrorMessage(cause, "Unable to load staff attendance"));
    } finally {
      setRefreshing(false);
    }
  }

  function goMonth(delta: number) {
    const next = addMonths(month, delta);
    if (next < monthMin) return;
    if (delta > 0 && !canGoNext) return;
    void refreshMonth(next);
  }

  async function markRow(rowKey: string, status: StaffMemberAttendanceStatusId) {
    const [kind, refId] = rowKey.split(":");
    setMutatingKey(rowKey);
    setRowError("");
    try {
      if (kind === "teacher") {
        await upsertTeacherAttendance({
          date: selectedDay,
          entries: [{ refId, status }],
        });
      } else {
        await upsertStaffMemberAttendance({
          date: selectedDay,
          entries: [{ refId, status }],
        });
      }
      await loadMonth(monthOf(selectedDay));
    } catch (cause) {
      setRowError(academicErrorMessage(cause, "Unable to record attendance"));
    } finally {
      setMutatingKey(null);
    }
  }

  async function markAllPresent() {
    setBulkBusy("mark");
    setRowError("");
    const unmarked = roster.filter((row) => row.status === null);
    if (unmarked.length === 0) {
      setBulkBusy(null);
      return;
    }
    const teacherEntriesToPost = unmarked
      .filter((row) => row.kind === "teacher")
      .map((row) => ({ refId: row.refId, status: "PRESENT" as const }));
    const memberEntriesToPost = unmarked
      .filter((row) => row.kind === "member")
      .map((row) => ({ refId: row.refId, status: "PRESENT" as const }));
    try {
      if (teacherEntriesToPost.length > 0) {
        await upsertTeacherAttendance({ date: selectedDay, entries: teacherEntriesToPost });
      }
      if (memberEntriesToPost.length > 0) {
        await upsertStaffMemberAttendance({ date: selectedDay, entries: memberEntriesToPost });
      }
      await loadMonth(monthOf(selectedDay));
    } catch (cause) {
      setRefreshError(academicErrorMessage(cause, "Unable to mark staff present"));
    } finally {
      setBulkBusy(null);
    }
  }

  function exportCsv() {
    setBulkBusy("export");
    try {
      const header = ["Name", "ID", "Department", "Status", "Left at", "Remarks", "Date"];
      const lines = [header.map(csvCell).join(",")];
      for (const row of filtered) {
        lines.push(
          [
            row.name,
            row.idNumber,
            row.department,
            row.status ? statusMeta(row.status).label : "Not marked",
            row.leftAt ?? "",
            row.remarks ?? "",
            selectedDay,
          ]
            .map(csvCell)
            .join(","),
        );
      }
      downloadCsvFile(`staff-attendance_${selectedDay}.csv`, lines.join("\r\n"));
    } finally {
      setBulkBusy(null);
    }
  }

  async function recordLeave(rowKey: string) {
    const [kind, refId] = rowKey.split(":");
    setSavingLeaveKey(rowKey);
    setRowError("");
    try {
      if (kind === "teacher") {
        await upsertTeacherAttendance({
          date: selectedDay,
          entries: [{ refId, status: "LEAVE" }],
        });
      } else {
        await upsertStaffMemberAttendance({
          date: selectedDay,
          entries: [{ refId, status: "LEAVE" }],
        });
      }
      await loadMonth(monthOf(selectedDay));
      setLeaveOpen(false);
      setLeaveQuery("");
    } catch (cause) {
      setRowError(academicErrorMessage(cause, "Unable to record leave"));
    } finally {
      setSavingLeaveKey(null);
    }
  }

  async function openHistory(row: RosterRow) {
    setHistoryKey(row.key);
    setHistoryLoading(true);
    setHistory(null);
    try {
      const monthsToFetch = [-2, -1, 0].map((delta) => addMonths(monthOf(selectedDay), delta));
      const fetched = await Promise.all(
        monthsToFetch.map(async (targetMonth) => {
          if (row.kind === "teacher") {
            const rows = await listTeacherAttendance({ teacherId: row.refId, month: targetMonth });
            return rows.filter((entry) => entry.teacherId === row.refId);
          }
          const rows = await listStaffMemberAttendance({ userId: row.refId, month: targetMonth });
          return rows.filter((entry) => entry.userId === row.refId);
        }),
      );
      const flattened = fetched
        .flat()
        .map<HistoryRecord>((entry) => ({
          date: String(entry.attendanceDate).slice(0, 10),
          status: entry.status,
          leftAt: entry.leftAt ?? null,
          remarks: entry.remarks ?? null,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setHistory(flattened);
    } catch (cause) {
      setHistory([]);
      setRowError(academicErrorMessage(cause, "Unable to load attendance history"));
    } finally {
      setHistoryLoading(false);
    }
  }

  const selectedHistoryRow = historyKey
    ? roster.find((row) => row.key === historyKey) ?? null
    : null;

  const leaveCandidates = React.useMemo(() => {
    const needle = leaveQuery.trim().toLowerCase();
    const pool = filtered.length > 0 ? filtered : roster;
    return pool
      .filter((row) => !needle || `${row.name} ${row.idNumber}`.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [leaveQuery, filtered, roster]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin / People &amp; Operations
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <CalendarDays size={20} className="text-primary" aria-hidden /> Staff Attendance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily presence tracking for teachers and administrative staff.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshMonth()} disabled={refreshing}>
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={14} aria-hidden />
          )}
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {initialError || refreshError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{refreshError || initialError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshMonth()} disabled={refreshing}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total active staff"
          value={String(roster.length)}
          caption={`${initialTeachers.filter((t) => t.status === "ACTIVE").length} teachers · ${initialMembers.length} non-teaching`}
        />
        <MetricCard
          icon={UserCheck}
          label="Present today"
          value={String(totals.present)}
          valueClassName="text-success"
          caption={`${presentPct}% of roster${totals.late > 0 ? ` · ${totals.late} marked late` : ""}`}
          extra={markedCount < roster.length ? `${roster.length - markedCount} not marked yet` : undefined}
        />
        <MetricCard
          icon={UserRoundX}
          label="Absent today"
          value={String(totals.absent)}
          valueClassName="text-destructive"
          caption={totals.permitted > 0 ? `${totals.permitted} excused separately` : "Not yet recorded"}
        />
        <MetricCard
          icon={Clock}
          label="Late & on leave"
          value={String(totals.late + totals.leave)}
          valueClassName="text-warning"
          caption={`${totals.late} late · ${totals.leave} on leave · ${totals.permitted} excused`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Attendance trend</CardTitle>
            <CardDescription>
              Daily presence rate for {monthLabel(month)} — present plus late over the roster.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {refreshing ? (
              <div className="h-[280px] w-full animate-pulse rounded-md bg-muted" />
            ) : trendData.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={CalendarX2}
                  title="No attendance recorded this month"
                  description="Mark attendance from the table below to build the trend."
                />
              </div>
            ) : (
              <ChartContainer config={trendConfig} className="h-[280px] w-full">
                <AreaChart data={trendData} margin={{ left: 4, right: 8, top: 12 }}>
                  <defs>
                    <linearGradient id="fillPresence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.65} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => `${Number(value)}% present`}
                      />
                    }
                  />
                  <Area
                    dataKey="rate"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#fillPresence)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>Department breakdown</CardTitle>
            <CardDescription>
              Presence rate by department for {dayDateLabel(selectedDay)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {refreshing ? (
              <div className="h-[280px] w-full animate-pulse rounded-md bg-muted" />
            ) : departmentChartData.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={UserRound}
                  title="Nothing marked today"
                  description="Department rates appear once attendance is recorded."
                />
              </div>
            ) : (
              <ChartContainer config={departmentConfig} className="h-[280px] w-full">
                <BarChart
                  data={departmentChartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${Number(value)}% present`}
                      />
                    }
                  />
                  <Bar dataKey="rate" fill="#14b8a6" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0">
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Daily register — {dayDateLabel(selectedDay)}</CardTitle>
              <CardDescription>
                {markedCount} of {roster.length} marked. Update any status inline.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goMonth(-1)}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} aria-hidden />
                </Button>
                <span className="min-w-[120px] text-center text-sm font-medium" aria-live="polite">
                  {monthLabel(month)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goMonth(1)}
                  disabled={month >= monthOf(localIsoDate())}
                  aria-label="Next month"
                >
                  <ChevronRight size={14} aria-hidden />
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void markAllPresent()} disabled={bulkBusy !== null}>
                {bulkBusy === "mark" ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <UserCheck size={14} aria-hidden />
                )}
                Mark all present
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={bulkBusy !== null}>
                <Download size={14} aria-hidden />
                Export
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeaveOpen(true);
                  setLeaveQuery("");
                }}
                disabled={bulkBusy !== null}
              >
                Record leave
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1" role="group" aria-label="Select a day">
            {buildDayChips(month).map((chip) => (
              <button
                key={chip.day}
                type="button"
                onClick={() => setSelectedDay(chip.dayKey)}
                aria-pressed={selectedDay === chip.dayKey}
                aria-label={`${chip.day} ${monthLabel(month)}`}
                className={`h-8 w-9 rounded-md border text-xs font-medium transition-colors ${
                  selectedDay === chip.dayKey
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {chip.day}
              </button>
            ))}
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px_180px_auto]">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, employee ID, or department"
                aria-label="Search staff"
                className="ps-8"
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger aria-label="Filter by department" className="h-8">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status" className="h-8">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ROSTER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_META[status].label}
                  </SelectItem>
                ))}
                <SelectItem value="unmarked">Not marked</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setDepartment("all");
                setStatusFilter("all");
              }}
              disabled={!filtersActive}
              className="justify-self-start lg:justify-self-auto"
            >
              Clear filters
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {rowError ? (
            <p role="alert" className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {rowError}
            </p>
          ) : null}

          {roster.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="No staff found"
                description="Add teachers and administrative staff first."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="No staff match these filters"
                description="Try a different name, department, or status."
                action={{
                  label: "Clear filters",
                  onClick: () => {
                    setQuery("");
                    setDepartment("all");
                    setStatusFilter("all");
                  },
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Staff &amp; ID
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Department
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Left at
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Update status
                    </th>
                    <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const meta = statusMeta(row.status);
                    return (
                      <tr
                        key={row.key}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 align-middle">
                          <span className="block font-medium">{row.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{row.idNumber}</span>
                        </td>
                        <td className="px-3 py-3 align-middle text-muted-foreground">{row.department}</td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {row.remarks ? (
                            <span className="mt-1 block max-w-[200px] truncate text-xs text-muted-foreground" title={row.remarks}>
                              {row.remarks}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 align-middle text-muted-foreground" aria-label="Departure time">
                          {row.leftAt ?? (row.status === "PRESENT" ? "Still in" : "-")}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Select
                            value={row.status ?? undefined}
                            onValueChange={(value) => void markRow(row.key, value as StaffMemberAttendanceStatusId)}
                            disabled={mutatingKey === row.key}
                          >
                            <SelectTrigger className="h-8 w-[140px]" aria-label={`Update status for ${row.name}`}>
                              {mutatingKey === row.key ? (
                                <Loader2 size={13} className="animate-spin" aria-hidden />
                              ) : (
                                <SelectValue placeholder="Mark..." />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {ROSTER_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {STATUS_META[status].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => void openHistory(row)}
                          >
                            <History size={13} aria-hidden />
                            History
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t text-xs text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{roster.length}</span> staff for {monthLabel(month)}
          </span>
          <span>
            One row per person per day · “Mark all present” fills only unmarked rows
          </span>
        </CardFooter>
      </Card>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record leave</DialogTitle>
            <DialogDescription>
              Pick a staff member to mark <strong>on leave</strong> for {dayDateLabel(selectedDay)}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={leaveQuery}
            onChange={(event) => setLeaveQuery(event.target.value)}
            placeholder="Search staff"
            aria-label="Search staff for leave"
          />
          <div className="max-h-[280px] space-y-1 overflow-y-auto">
            {leaveCandidates.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.department} · {row.idNumber}
                  </p>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => void recordLeave(row.key)}
                  disabled={savingLeaveKey !== null}
                >
                  {savingLeaveKey === row.key ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <CalendarX2 size={13} aria-hidden />
                  )}
                  Mark leave
                </Button>
              </div>
            ))}
            {leaveCandidates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No staff match.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setLeaveOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(historyKey)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setHistoryKey(null);
            setHistory(null);
          }
        }}
      >
        <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 pe-12">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider">
              Attendance history
            </SheetDescription>
            <SheetTitle className="text-lg">{selectedHistoryRow?.name ?? "Staff"}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selectedHistoryRow?.department ?? "-"} · last 3 months.
            </p>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 size={16} className="me-2 animate-spin" aria-hidden /> Loading history...
              </div>
            ) : history && history.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {history.map((record) => {
                  const meta = statusMeta(record.status);
                  return (
                    <li key={record.date} className="flex items-center justify-between gap-2 p-3">
                      <div>
                        <p className="text-sm font-medium">{record.date}</p>
                        {record.remarks ? (
                          <p className="text-xs text-muted-foreground" title={record.remarks}>
                            {record.remarks}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {record.leftAt ? <span>Left {record.leftAt}</span> : null}
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarX2}
                title="No attendance recorded"
                description="This staff member has no records in the last three months."
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type DayChip = { day: string; dayKey: string; marked: boolean; rate: number | null };

function buildDayChips(month: string): DayChip[] {
  const limit = daysInMonth(month);
  const todayMonth = monthOf(localIsoDate());
  const now = new Date();
  const maxDay = month <= todayMonth ? (month === todayMonth ? now.getDate() : limit) : 0;
  return Array.from({ length: limit }, (_, index) => {
    const day = index + 1;
    return {
      day: String(day),
      dayKey: `${month}-${String(day).padStart(2, "0")}`,
      marked: day <= maxDay,
      rate: null,
    };
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  extra,
  valueClassName,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  caption: string;
  extra?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon size={16} className="text-muted-foreground" aria-hidden />
      </div>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${valueClassName ?? ""}`}>{value}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{caption}</p>
      {extra ? <p className="mt-0.5 text-xs text-warning">{extra}</p> : null}
    </div>
  );
}
