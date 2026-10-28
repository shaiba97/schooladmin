import { StudentResultsClient } from "@/components/academics/examinations/student-results-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentResultsClient studentId={id} />;
}
