import { redirect } from "next/navigation";

/** The Exam Wizard lives on the Examination Center home (master exam table). */
export default function SchedulePage() {
  redirect("/school/admin/exams");
}
