export function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function formatAcademicDate(value: string | null | undefined) {
  const date = dateInputValue(value);
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value ?? "—";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function academicErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** Approximate age in whole years from a stored date-of-birth date. */
export function ageFromDob(dateOfBirth: string | null | undefined) {
  const date = dateInputValue(dateOfBirth);
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const beforeBirthday =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
