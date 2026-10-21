import type { ApiEnrollment, ApiStudent } from "./types";

export function studentFullName(student: Pick<ApiStudent, "firstName" | "lastName" | "middleName">) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
}

export function currentEnrollment(student: ApiStudent): ApiEnrollment | undefined {
  return student.enrollments?.[0];
}

export function currentClassLabel(student: ApiStudent) {
  const enrollment = currentEnrollment(student);
  return enrollment?.schoolClass?.className ?? "—";
}
