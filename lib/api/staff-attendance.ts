import { adminApiFetch } from "./client";
import type { ApiStaffAttendanceEntry, ApiStaffMemberAttendanceEntry } from "./types";

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
  return adminApiFetch<ApiStaffMemberAttendanceEntry[]>(`/staff-attendance/members?${params.toString()}`);
}
