import { adminApiFetch } from "./client";
import type {
  ApiExam,
  ApiExamAnalytics,
  ApiExamSubject,
  ApiPaginated,
  ApiRoomAssignment,
  CreateExamPayload,
  CreateExamSubjectPayload,
  CreateRoomAssignmentPayload,
} from "./types";

/**
 * Exam lifecycle surface. Reads are open to every signed-in staff member;
 * writes are gated backend-side (src/exams/exams.controller.ts) to staff
 * admins, while mark entry is also open to teachers.
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

export function createExam(payload: CreateExamPayload) {
  return adminApiFetch<ApiExam | ApiExam[]>("/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExam(id: string, payload: Partial<CreateExamPayload> & { status?: string }) {
  return adminApiFetch<ApiExam>(`/exams/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function addExamSubject(examId: string, payload: CreateExamSubjectPayload) {
  return adminApiFetch<ApiExamSubject>(`/exams/${examId}/subjects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeExamSubject(examId: string, subjectId: string) {
  return adminApiFetch<{ id: string }>(`/exams/${examId}/subjects/${subjectId}`, {
    method: "DELETE",
  });
}

export function enterSubjectMarks(
  examSubjectId: string,
  records: Array<{ studentId: string; marks: number; remarks?: string }>,
) {
  return adminApiFetch(`/exams/subjects/${examSubjectId}/marks`, {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export function publishExamResults(examId: string) {
  return adminApiFetch<{ published: boolean }>(`/exams/${examId}/publish`, { method: "POST" });
}

export function getExamAnalytics(examId: string) {
  return adminApiFetch<ApiExamAnalytics>(`/exams/${examId}/analytics`);
}

export function listExamRooms(examId: string) {
  return adminApiFetch<ApiRoomAssignment[]>(`/exams/${examId}/rooms`);
}

export function assignExamRoom(examId: string, payload: CreateRoomAssignmentPayload) {
  return adminApiFetch<ApiRoomAssignment>(`/exams/${examId}/rooms`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRoomInvigilators(examId: string, roomId: string, invigilatorIds: string[]) {
  return adminApiFetch<ApiRoomAssignment>(`/exams/${examId}/rooms/${roomId}/invigilators`, {
    method: "PUT",
    body: JSON.stringify({ invigilatorIds }),
  });
}

export function removeExamRoom(examId: string, roomId: string) {
  return adminApiFetch<{ id: string }>(`/exams/${examId}/rooms/${roomId}`, { method: "DELETE" });
}
