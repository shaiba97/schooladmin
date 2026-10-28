import { adminApiFetch } from "./client";
import type { ApiPaginated, ApiReferenceData, ApiStudent, ApiStudentAttendanceRecord, ApiStudentGuardianLink, ApiStudentResult, ApiTenantResult, StudentListQuery } from "./types";

/**
 * Read-only student surface. Every function below hits the exact GET
 * endpoints the Academic Affairs portal uses (lib/api/students.ts there);
 * the admin portal mirrors its views but never issues a mutation.
 */
export function listStudents(query: StudentListQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.classId) params.set("classId", query.classId);
  if (query.academicYearId) params.set("academicYearId", query.academicYearId);
  if (query.educationLevel) params.set("educationLevel", query.educationLevel);
  if (query.grade !== undefined) params.set("grade", String(query.grade));
  return adminApiFetch<ApiPaginated<ApiStudent>>(`/students?${params.toString()}`);
}

export function getStudent(id: string) {
  return adminApiFetch<ApiStudent>(`/students/${id}`);
}

export function getStudentReferenceData() {
  return adminApiFetch<ApiReferenceData>("/students/reference-data");
}

export function listStudentGuardians(studentId: string) {
  return adminApiFetch<ApiStudentGuardianLink[]>(`/students/${studentId}/guardians`);
}

export function listStudentResults(studentId: string) {
  return adminApiFetch<ApiStudentResult[]>(`/students/${studentId}/results`);
}

export function listStudentAttendanceRecords(studentId: string) {
  return adminApiFetch<ApiStudentAttendanceRecord[]>(`/students/${studentId}/attendance-records`);
}

export function listTenantResults(query: { examTypeId?: string } = {}) {
  const params = new URLSearchParams();
  if (query.examTypeId) params.set("examTypeId", query.examTypeId);
  const suffix = params.toString();
  return adminApiFetch<ApiTenantResult[]>(
    `/students/results/board${suffix ? `?${suffix}` : ""}`,
  );
}
