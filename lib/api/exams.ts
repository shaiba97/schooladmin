import { adminApiFetch } from "./client";
import type { ApiExam, ApiPaginated } from "./types";

/**
 * Read-only exam surfaces. Exams are created and maintained in the Academic
 * Affairs portal; the admin portal only lists exams and loads their details
 * (subjects, results, room assignments). Roles gate every endpoint
 * backend-side (src/exams/exams.service.ts).
 */
export function listExams(query: { yearId?: string; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.yearId) params.set("yearId", query.yearId);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return adminApiFetch<ApiPaginated<ApiExam>>(`/exams?${params.toString()}`);
}

export function getExam(id: string) {
  return adminApiFetch<ApiExam>(`/exams/${id}`);
}
