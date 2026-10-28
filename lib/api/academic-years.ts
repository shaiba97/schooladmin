import { adminApiFetch } from "./client";
import type { ApiAcademicYear, ApiPaginated } from "./types";

export function listAcademicYears(query: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return adminApiFetch<ApiPaginated<ApiAcademicYear>>(`/academic-years?${params.toString()}`);
}

export function getAcademicYear(id: string) {
  return adminApiFetch<ApiAcademicYear>(`/academic-years/${id}`);
}
