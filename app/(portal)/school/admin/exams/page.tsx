import { ExaminationCenterClient } from "@/components/academics/examinations/examination-center-client";
import { listExamTypes } from "@/lib/api/exam-types";
import { listExams } from "@/lib/api/exams";
import { listHalls } from "@/lib/api/halls";
import type { ApiExam, ApiExamType, ApiHall } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page() {
  const [examsResult, typesResult, hallsResult] = await Promise.allSettled([
    listExams({ page: 1, limit: 200 }),
    listExamTypes(),
    listHalls(),
  ]);

  const exams: ApiExam[] = examsResult.status === "fulfilled" ? examsResult.value.data : [];
  const examTypes: ApiExamType[] = typesResult.status === "fulfilled" ? typesResult.value : [];
  const halls: ApiHall[] = hallsResult.status === "fulfilled" ? hallsResult.value : [];

  const messages: string[] = [];
  if (examsResult.status === "rejected") {
    messages.push(academicErrorMessage(examsResult.reason, "Unable to load exams"));
  }
  if (typesResult.status === "rejected") {
    messages.push(academicErrorMessage(typesResult.reason, "Unable to load exam types"));
  }
  if (hallsResult.status === "rejected") {
    messages.push(academicErrorMessage(hallsResult.reason, "Unable to load rooms"));
  }

  return (
    <ExaminationCenterClient
      exams={exams}
      examTypes={examTypes}
      halls={halls}
      loadError={messages.join(" ")}
    />
  );
}
