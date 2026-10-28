import { redirect } from "next/navigation";

export default function LegacyCreateExamPage() {
  redirect("/school/admin/exams/create");
}
