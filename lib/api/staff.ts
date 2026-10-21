import { adminApiFetch } from "./client";
import type { ApiStaffDirectoryMember } from "./types";

/** The non-teaching staff directory (system/operational/custom positions). */
export function listStaff() {
  return adminApiFetch<ApiStaffDirectoryMember[]>("/staff");
}
