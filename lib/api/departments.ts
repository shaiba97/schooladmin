import { adminApiFetch } from "./client";
import type { ApiDepartment } from "./types";

export function listDepartments() {
  return adminApiFetch<ApiDepartment[]>("/departments");
}
