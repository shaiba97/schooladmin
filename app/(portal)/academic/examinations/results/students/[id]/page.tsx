import { redirect } from "next/navigation";

export default async function LegacyStudentResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/school/admin/exams/results/students/${id}`);
}
