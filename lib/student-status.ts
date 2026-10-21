/**
 * Student status → Badge variant. Mirrors the Academic Affairs portal
 * mapping; the admin surface is read-only, so the status-change machinery
 * around it (useStudentActions there) is intentionally not ported.
 */
export function studentStatusBadgeVariant(
  status: string,
): "success" | "info" | "purple" | "warning" | "destructive" | "muted" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "TRANSFERRED":
      return "info";
    case "GRADUATED":
      return "purple";
    case "POSTPONED":
      return "warning";
    case "FIRED":
      return "destructive";
    default:
      return "muted";
  }
}

/**
 * All student statuses the Academic backend assigns. The directory filter
 * mirrors this list (Academic parity); "SUSPENDED" from the prompt spec does
 * not exist in the model, per the approved plan.
 */
export const STUDENT_STATUSES = [
  "PENDING_ADMISSION",
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
  "TRANSFERRED",
  "WITHDRAWN",
  "POSTPONED",
  "FIRED",
] as const;
