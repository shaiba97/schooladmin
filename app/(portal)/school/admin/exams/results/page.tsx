import { ResultsWizard } from "@/components/academics/examinations/results-wizard";
import { listExamTypes } from "@/lib/api/exam-types";
import { listExams } from "@/lib/api/exams";
import type { ApiExam, ApiExamType } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page() {
  const [examsResult, typesResult] = await Promise.allSettled([
    listExams({ page: 1, limit: 200 }),
    listExamTypes(),
  ]);

  const exams: ApiExam[] = examsResult.status === "fulfilled" ? examsResult.value.data : [];
  const examTypes: ApiExamType[] = typesResult.status === "fulfilled" ? typesResult.value : [];

  const messages: string[] = [];
  if (examsResult.status === "rejected") {
    messages.push(academicErrorMessage(examsResult.reason, "Unable to load exams"));
  }
  if (typesResult.status === "rejected") {
    messages.push(academicErrorMessage(typesResult.reason, "Unable to load exam types"));
  }

  return <ResultsWizard exams={exams} examTypes={examTypes} loadError={messages.join(" ")} />;
}
