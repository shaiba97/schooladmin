import { adminApiFetch } from "./client";
import type { ApiAttendanceSession } from "./types";

/** Today's attendance sessions with class and record counts. */
export function listTodayAttendanceSessions() {
  return adminApiFetch<ApiAttendanceSession[]>("/attendance/sessions/today");
}

/** The session a class held on a calendar date (YYYY-MM-DD) — null when none. */
export function listSessionForClassDate(classId: string, date: string) {
  return adminApiFetch<ApiAttendanceSession | null>(`/attendance/classes/${classId}?date=${date}`);
}

export type ApiAttendanceMatrixRow = {
  attendanceDate: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  status: string;
  remarks: string | null;
};

/** Attendance records across a date range (YYYY-MM-DD dates, `to` inclusive), optionally class-scoped. */
export function listAttendanceMatrix(params: {
  from: string;
  to: string;
  classId?: string;
}) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.classId) search.set("classId", params.classId);
  return adminApiFetch<ApiAttendanceMatrixRow[]>(`/attendance/matrix?${search.toString()}`);
}
