import { adminApiFetch } from "./client";
import type { ApiTimetableEntry } from "./types";

export type TimetableListQuery = {
  timetableType?: string;
  examName?: string;
};

/** Year-wide timetable — the source the derived Teacher view groups. */
export function listTimetableForYear(query: TimetableListQuery = {}) {
  const params = new URLSearchParams();
  if (query.timetableType) params.set("timetableType", query.timetableType);
  if (query.examName) params.set("examName", query.examName);
  return adminApiFetch<ApiTimetableEntry[]>(`/timetable?${params.toString()}`);
}

/** Class-scoped timetable — the read side of the academic grid. */
export function listTimetableForClass(classId: string, query: TimetableListQuery = {}) {
  const params = new URLSearchParams();
  if (query.timetableType) params.set("timetableType", query.timetableType);
  if (query.examName) params.set("examName", query.examName);
  return adminApiFetch<ApiTimetableEntry[]>(`/timetable/class/${classId}?${params.toString()}`);
}
