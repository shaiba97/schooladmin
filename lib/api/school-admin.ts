import { adminApiFetch } from "./client";
import type {
  ApiSchoolAdminOverview,
  ApiSchoolPosition,
  ApiTenantUpdateInput,
} from "./types";

/**
 * The school administrator's own workspace. Every call is scoped to the
 * tenant in the session, so the administrator never names a school.
 */
export function schoolAdminOverview() {
  return adminApiFetch<ApiSchoolAdminOverview>("/school-admin/overview");
}

export function updateSchoolAdminProfile(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}) {
  return adminApiFetch<{ id: string; firstName: string; lastName: string; email: string | null }>(
    "/school-admin/profile",
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function updateSchoolTenant(input: ApiTenantUpdateInput) {
  return adminApiFetch<ApiSchoolAdminOverview["tenant"]>("/school-admin/tenant", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createSchoolPosition(input: {
  title: string;
  portal: string;
  description?: string;
}) {
  return adminApiFetch<ApiSchoolPosition>("/school-admin/positions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteSchoolPosition(id: string) {
  return adminApiFetch<{ id: string; deleted: boolean }>(
    `/school-admin/positions/${id}`,
    { method: "DELETE" },
  );
}

export function requestTierChange(input: { planId: string; note?: string }) {
  return adminApiFetch<{ requested: boolean; plan: { id: string; code: string; name: string } }>(
    "/school-admin/subscription/tier-request",
    { method: "POST", body: JSON.stringify(input) },
  );
}
