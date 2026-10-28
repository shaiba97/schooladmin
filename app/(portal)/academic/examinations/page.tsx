import { redirect } from "next/navigation";

/** Legacy location; the Examination Center now lives at /school/admin/exams. */
export default function LegacyExaminationsPage() {
  redirect("/school/admin/exams");
}
