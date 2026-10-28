import { adminApiFetch } from "./client";
import type {
  ApiStaffAttendanceEntry,
  ApiStaffMemberAttendanceEntry,
  AttendanceUpsertPayload,
} from "./types";

/** Teaching-staff (Teacher personnel) attendance rows for a month — flat entries. */
export function listTeacherAttendance(query: { month?: string; teacherId?: string } = {}) {
  const params = new URLSearchParams();
  if (query.month) params.set("month", query.month);
  if (query.teacherId) params.set("teacherId", query.teacherId);
  return adminApiFetch<ApiStaffAttendanceEntry[]>(`/staff-attendance?${params.toString()}`);
}

/** Non-teaching staff-member attendance rows (the parallel StaffMemberAttendance table). */
export function listStaffMemberAttendance(query: { month?: string; userId?: string } = {}) {
  const params = new URLSearchParams();
  if (query.month) params.set("month", query.month);
  if (query.userId) params.set("userId", query.userId);
  return adminApiFetch<ApiStaffMemberAttendanceEntry[]>(
    `/staff-attendance/members?${params.toString()}`,
  );
}

/** Upsert teacher attendance rows for a single date (one row per teacher per day). */
export function upsertTeacherAttendance(
  payload: Omit<AttendanceUpsertPayload, "entries"> & {
    entries: Array<{ refId: string } & Omit<AttendanceUpsertPayload["entries"][number], "refId">>;
  },
) {
  return adminApiFetch<unknown[]>("/staff-attendance/entries", {
    method: "POST",
    body: JSON.stringify({
      date: payload.date,
      entries: payload.entries.map((entry) => ({
        teacherId: entry.refId,
        status: entry.status,
        ...(entry.leftAt ? { leftAt: entry.leftAt } : {}),
        ...(entry.remarks ? { remarks: entry.remarks } : {}),
      })),
    }),
    headers: { "Content-Type": "application/json" },
  });
}

/** Upsert non-teaching staff-member attendance rows for a single date. */
export function upsertStaffMemberAttendance(
  payload: Omit<AttendanceUpsertPayload, "entries"> & {
    entries: Array<{ refId: string } & Omit<AttendanceUpsertPayload["entries"][number], "refId">>;
  },
) {
  return adminApiFetch<unknown[]>("/staff-attendance/members/entries", {
    method: "POST",
    body: JSON.stringify({
      date: payload.date,
      entries: payload.entries.map((entry) => ({
        userId: entry.refId,
        status: entry.status,
        ...(entry.leftAt ? { leftAt: entry.leftAt } : {}),
        ...(entry.remarks ? { remarks: entry.remarks } : {}),
      })),
    }),
    headers: { "Content-Type": "application/json" },
  });
}
