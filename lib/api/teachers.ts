import { adminApiFetch } from "./client";
import { toTitleCase } from "@/lib/text";
import type {
  ApiDepartment,
  ApiPaginated,
  ApiTeacher,
  ApiTeacherCredential,
  TeacherQuery,
} from "./types";

/**
 * Read-only teacher surface mirroring the Academic Affairs endpoints
 * (lib/api/teachers.ts there). The admin portal views teacher records but
 * never issues a mutation — create/update/status/delete and the file
 * staging endpoints are intentionally absent here.
 */
export function listTeachers(query: TeacherQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  return adminApiFetch<ApiPaginated<ApiTeacher>>(`/teachers?${params.toString()}`);
}

export function getTeacher(id: string) {
  return adminApiFetch<ApiTeacher>(`/teachers/${id}`);
}

export function listTeacherCredentials(teacherId: string) {
  return adminApiFetch<ApiTeacherCredential[]>(`/teachers/${teacherId}/credentials`);
}

export function profileImageDocument(teacher: ApiTeacher) {
  return teacher.documents?.find((document) => document.documentType === "PROFILE_IMAGE") ?? null;
}

export function idProofDocument(teacher: ApiTeacher) {
  return teacher.documents?.find((document) => document.documentType === "ID_PROOF") ?? null;
}

export function deptName(teacher: ApiTeacher, departments: ApiDepartment[]) {
  return teacher.department?.name ?? departments.find((department) => department.id === teacher.departmentId)?.name ?? "Unassigned";
}

export function fullName(teacher: ApiTeacher) {
  const firstName = toTitleCase(teacher.user?.firstName ?? "");
  const lastName = toTitleCase(teacher.user?.lastName ?? "");
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Unnamed teacher";
}
