import { redirect } from "next/navigation";

export default function LegacyResultsPage() {
  redirect("/school/admin/exams/results");
}
