import { adminApiFetch } from "./client";
import type { ApiExamType } from "./types";

export function listExamTypes() {
  return adminApiFetch<ApiExamType[]>("/exam-types");
}
