"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { DayAttendanceBadge, StatChip } from "./attendance-badges";
import { DAY_OF_WEEK_KEYS, addDays, fromDayKey } from "./workdays";

export type DetailRecord = {
  dateKey: string;
  status: string;
  remarks?: string | null;
  leftAt?: string | null;
};

type DetailType = "student" | "teacher" | "staff";

const YEAR_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

const STATUSES: Record<DetailType, { ids: string[]; labels: Record<string, string> }> = {
  student: {
    ids: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
    labels: { PRESENT: "Present", ABSENT: "Absent", LATE: "Late", EXCUSED: "Excused" },
  },
  teacher: {
    ids: ["PRESENT", "ABSENT", "LEAVE"],
    labels: { PRESENT: "Present", ABSENT: "Absent", LEAVE: "On leave" },
  },
  staff: {
    ids: ["PRESENT", "ABSENT", "LEAVE"],
    labels: { PRESENT: "Present", ABSENT: "Absent", LEAVE: "On leave" },
  },
};

type Props = {
  type: DetailType;
  member: { name: string; initials: string; lines: string[]; notFound?: boolean };
  records: DetailRecord[];
  /** REGULAR non-break dayOfWeek tokens (school-wide timetable). */
  schoolDays: readonly string[];
  loadError?: string;
};

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return null;
  const last = new Date(Date.UTC(y, m, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${y}-${pad(m)}-01`,
    to: `${y}-${pad(m)}-${pad(last.getUTCDate())}`,
    label: `${YEAR_MONTHS[m - 1]} ${y}`,
  };
}

function shiftMonth(month: string, offset: number) {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthCalendarRows(month: string): string[][] {
  const range = monthRange(month);
  if (!range) return [];
  const rows: string[][] = [];
  let cursor = range.from;
  const last = range.to;
  while (cursor <= last) {
    const seeds = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    rows.push(seeds.map((key) => (key <= last ? key : "")));
    cursor = addDays(cursor, 7);
  }
  return rows;
}

export function AttendanceDetailClient(props: Props) {
  const { type, member, records, schoolDays, loadError } = props;
  const router = useRouter();
  const [month, setMonth] = React.useState(currentMonth());
  const [statusFilter, setStatusFilter] = React.useState("");

  // Detail rows come from the server render; an attendance event anywhere
  // re-renders this route so the calendar shows the fresh state.
  useRealtimeEvent(["attendance.marked", "attendance_updated"], {
    onEvent: () => router.refresh(),
    onReconnect: () => router.refresh(),
  });

  const vocab = STATUSES[type];
  const range = React.useMemo(() => monthRange(month), [month]);

  const monthRows = React.useMemo(
    () =>
      records
        .filter((r) => (range ? r.dateKey >= range.from && r.dateKey <= range.to : false))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [records, range],
  );

  const counts = React.useMemo(() => {
    const tally: Record<string, number> = {};
    for (const status of vocab.ids) tally[status] = 0;
    for (const row of monthRows) if (row.status in tally) tally[row.status] += 1;
    let rate: string | null;
    if (type === "student") {
      const denominator = tally.ABSENT + tally.LATE + tally.PRESENT;
      rate = denominator === 0 ? null : `${Math.round((100 * (tally.PRESENT + tally.LATE)) / denominator)}%`;
    } else {
      const denominator = tally.ABSENT + tally.PRESENT;
      rate = denominator === 0 ? null : `${Math.round((100 * tally.PRESENT) / denominator)}%`;
    }
    return { tally, rate };
  }, [monthRows, type, vocab]);

  const historyRows = React.useMemo(
    () => (statusFilter ? records.filter((r) => r.status === statusFilter) : records).slice(0, 200),
    [records, statusFilter],
  );

  const schoolSet = React.useMemo(() => {
    const known = new Set<string>(DAY_OF_WEEK_KEYS);
    const set = new Set(schoolDays.map((d) => d.trim().toUpperCase()).filter((d) => known.has(d)));
    return set;
  }, [schoolDays]);

  function isSchoolDay(dowIndex: number) {
    if (schoolSet.size === 0) return dowIndex >= 1 && dowIndex <= 5;
    return schoolSet.has(DAY_OF_WEEK_KEYS[dowIndex]);
  }

  const backHref = `/academic/attendance?tab=${type === "teacher" ? "teachers" : type === "staff" ? "staff" : "students"}`;

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-ring"
      >
        <ArrowLeft size={14} />
        Back to attendance workspace
      </Link>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-4">
          {member.notFound ? (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">?</span>
          ) : (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{member.initials}</span>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{member.name}</h1>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {member.lines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {member.notFound ? (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This {type} is not visible with your current access — showing an empty log.
        </p>
      ) : null}
      {loadError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft size={15} />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{range?.label ?? month}</span>
          <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight size={15} />
          </Button>
          <Button variant="ghost" size="sm" className="ml-1 text-xs text-muted-foreground" onClick={() => setMonth(currentMonth())}>
            Current month
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {vocab.ids.map((id) => (
            <StatChip key={id} label={vocab.labels[id] ?? id} value={String(counts.tally[id])} />
          ))}
          <StatChip label="Rate" value={counts.rate ?? "—"} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card" aria-label={`Attendance calendar for ${range?.label ?? month}`}>
        <table className="w-full table-fixed text-center text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <th key={d} scope="col" className="px-2 py-2 font-medium">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthCalendarRows(month).map((row, i) => (
              <tr key={i} className={i === 0 ? "" : "border-t"}>
                {row.map((key, j) => {
                  if (key === "") {
                    return (
                      <td key={j} className="h-20 border-l bg-muted/20 px-1 py-1" aria-hidden>
                        <span className="text-[10px] text-muted-foreground/40">·</span>
                      </td>
                    );
                  }
                  const day = fromDayKey(key);
                  const dowIndex = day.getUTCDay();
                  const school = isSchoolDay(dowIndex);
                  if (!school) {
                    return (
                      <td key={key} className="h-20 border-l bg-muted/20 px-1 py-1 align-top" aria-label={`${key} — non-school day`}>
                        <span className="block pt-0.5 text-[10px] text-muted-foreground/40">{String(day.getUTCDate()).padStart(2, "0")}</span>
                      </td>
                    );
                  }
                  const record = monthRows.find((r) => r.dateKey === key);
                  return (
                    <td key={key} className="h-20 border-l px-1 py-1 align-top transition-colors hover:bg-muted/30">
                      <span className="block pt-0.5 text-[10px] tabular-nums text-muted-foreground">{String(day.getUTCDate()).padStart(2, "0")}</span>
                      <span className="mt-1 block">
                        {record ? <DayAttendanceBadge status={record.status} /> : <span className="text-[10px] text-muted-foreground/40" aria-label="no record">·</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">History</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter history by status"
          className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
        >
          <option value="">All statuses</option>
          {vocab.ids.map((id) => (
            <option key={id} value={id}>{vocab.labels[id] ?? id}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{historyRows.length} record(s)</span>
      </div>

      {historyRows.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {statusFilter ? "No records with this status." : "No attendance records yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historyRows.map((row, i) => {
                const day = fromDayKey(row.dateKey);
                const label = `${YEAR_MONTHS[day.getUTCMonth()].slice(0, 3)} ${String(day.getUTCDate()).padStart(2, "0")}, ${day.getUTCFullYear()}`;
                return (
                  <tr key={`${row.dateKey}-${i}`} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2 tabular-nums">{label}</td>
                    <td className="px-4 py-2"><DayAttendanceBadge status={row.status} /></td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {row.remarks || "—"}
                      {row.leftAt ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">left {row.leftAt}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
