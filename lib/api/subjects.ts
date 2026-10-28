import { adminApiFetch } from "./client";
import type { ApiClassSubject, ApiPaginated, ApiSubject } from "./types";

export function listSubjects(query: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return adminApiFetch<ApiPaginated<ApiSubject>>(`/subjects?${params.toString()}`);
}

export function listClassSubjects(classId: string) {
  return adminApiFetch<ApiClassSubject[]>(`/subjects/classes/${classId}`);
}
