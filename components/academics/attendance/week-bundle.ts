import { listAttendanceMatrix, type ApiAttendanceMatrixRow } from "@/lib/api/attendance";
import { listStaffMemberAttendance, listTeacherAttendance } from "@/lib/api/staff-attendance";
import type { ApiStaffAttendanceEntry, ApiStaffMemberAttendanceEntry } from "@/lib/api/types";
import { addDays, dateKeyOf } from "./workdays";

export type AttendanceWeekBundle = {
  rows: ApiAttendanceMatrixRow[];
  teacherEntries: ApiStaffAttendanceEntry[];
  memberEntries: ApiStaffMemberAttendanceEntry[];
  /** Human-readable list of audiences whose fetch failed; empty when all loaded. */
  failures: string[];
};

function monthKeysBetween(from: string, to: string): string[] {
  return [...new Set<string>([from.slice(0, 7), to.slice(0, 7)])];
}

/**
 * Everything a week matrix needs: student records for the exact window plus
 * teacher/staff entry rows (fetched per month, since those endpoints only
 * accept `month`, then narrowed to the window). Safe to call from the SSR
 * page and the live week navigator — the same code always.
 */
export async function fetchWeekBundle(from: string, classId?: string): Promise<AttendanceWeekBundle> {
  const to = addDays(from, 6);
  const months = monthKeysBetween(from, to);
  const [matrix, teacherBatches, memberBatches] = await Promise.allSettled([
    listAttendanceMatrix({ from, to, classId: classId || undefined }),
    Promise.all(months.map((m) => listTeacherAttendance({ month: m }))),
    Promise.all(months.map((m) => listStaffMemberAttendance({ month: m }))),
  ]);

  const failures: string[] = [];
  let rows: ApiAttendanceMatrixRow[] = [];
  if (matrix.status === "fulfilled") rows = matrix.value;
  else failures.push("student records");

  let teacherEntries: ApiStaffAttendanceEntry[] = [];
  if (teacherBatches.status === "fulfilled") teacherEntries = teacherBatches.value.flat();
  else failures.push("teacher entries");

  let memberEntries: ApiStaffMemberAttendanceEntry[] = [];
  if (memberBatches.status === "fulfilled") memberEntries = memberBatches.value.flat();
  else failures.push("staff entries");

  // Some entry endpoints serialize DATE columns as full ISO; normalize to
  // plain keys so cells line up with the workspace's week-window keys.
  teacherEntries = teacherEntries.map((e) => ({ ...e, attendanceDate: dateKeyOf(e.attendanceDate) }));
  memberEntries = memberEntries.map((e) => ({ ...e, attendanceDate: dateKeyOf(e.attendanceDate) }));
  teacherEntries = teacherEntries.filter((e) => e.attendanceDate >= from && e.attendanceDate <= to);
  memberEntries = memberEntries.filter((e) => e.attendanceDate >= from && e.attendanceDate <= to);

  return { rows, teacherEntries, memberEntries, failures };
}
