import { adminApiFetch } from "./client";
import type { ApiPaginated, ApiSchoolClass } from "./types";

export function listClasses(query: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return adminApiFetch<ApiPaginated<ApiSchoolClass>>(`/classes?${params.toString()}`);
}

export function getClass(id: string) {
  return adminApiFetch<ApiSchoolClass>(`/classes/${id}`);
}
