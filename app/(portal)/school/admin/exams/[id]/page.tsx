import { ExamDetailClient } from "@/components/academics/examinations/exam-detail-client";
import { getExam } from "@/lib/api/exams";
import { listExamTypes } from "@/lib/api/exam-types";
import type { ApiExamType } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [examResult, typesResult] = await Promise.allSettled([
    getExam(id),
    listExamTypes(),
  ]);

  const exam = examResult.status === "fulfilled" ? examResult.value : null;
  const examTypes: ApiExamType[] = typesResult.status === "fulfilled" ? typesResult.value : [];

  const messages: string[] = [];
  if (examResult.status === "rejected") {
    messages.push(academicErrorMessage(examResult.reason, "Unable to load the exam"));
  }
  if (typesResult.status === "rejected") {
    messages.push(academicErrorMessage(typesResult.reason, "Unable to load exam types"));
  }

  return (
    <ExamDetailClient
      initialExam={exam}
      examTypes={examTypes}
      loadError={messages.join(" ")}
    />
  );
}
