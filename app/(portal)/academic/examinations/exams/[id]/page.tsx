import { redirect } from "next/navigation";

export default async function LegacyExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/school/admin/exams/${id}`);
}
