import { ExaminationsClient } from "@/components/academics/examinations/examinations-client";
import { listClasses } from "@/lib/api/classes";
import { listExams } from "@/lib/api/exams";
import { listExamTypes } from "@/lib/api/exam-types";
import { listGradingScales } from "@/lib/api/grading";
import { listHalls } from "@/lib/api/halls";
import { listTimetableForYear } from "@/lib/api/timetable";
import type {
  ApiExam,
  ApiExamType,
  ApiGradingScale,
  ApiHall,
  ApiPaginated,
  ApiSchoolClass,
  ApiTimetableEntry,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;

  const [examsResult, typesResult, scalesResult, classesResult, hallsResult, timetableResult] =
    await Promise.allSettled([
      listExams({ page: 1, limit: 100 }),
      listExamTypes(),
      listGradingScales(),
      listClasses({ page: 1, limit: 999 }),
      listHalls(),
      listTimetableForYear(),
    ]);

  const exams: ApiPaginated<ApiExam> = examsResult.status === "fulfilled"
    ? examsResult.value
    : { data: [], total: 0, page: 1, limit: 100 };
  const examTypes: ApiExamType[] = typesResult.status === "fulfilled" ? typesResult.value : [];
  const gradingScales: ApiGradingScale[] = scalesResult.status === "fulfilled" ? scalesResult.value : [];
  const classes: ApiSchoolClass[] = classesResult.status === "fulfilled" ? classesResult.value.data : [];
  const halls: ApiHall[] = hallsResult.status === "fulfilled" ? hallsResult.value : [];
  const timetableEntries: ApiTimetableEntry[] = timetableResult.status === "fulfilled" ? timetableResult.value : [];

  const messages: string[] = [];
  if (examsResult.status === "rejected") messages.push(academicErrorMessage(examsResult.reason, "Unable to load exams"));
  if (typesResult.status === "rejected") messages.push(academicErrorMessage(typesResult.reason, "Unable to load exam types"));
  if (scalesResult.status === "rejected") messages.push(academicErrorMessage(scalesResult.reason, "Unable to load grading scales"));
  if (classesResult.status === "rejected") messages.push(academicErrorMessage(classesResult.reason, "Unable to load classes"));
  if (hallsResult.status === "rejected") messages.push(academicErrorMessage(hallsResult.reason, "Unable to load halls"));
  if (timetableResult.status === "rejected") messages.push(academicErrorMessage(timetableResult.reason, "Unable to load timetables"));

  return (
    <ExaminationsClient
      initialTab={Array.isArray(tab) ? tab[0] : tab}
      exams={exams}
      examTypes={examTypes}
      gradingScales={gradingScales}
      classes={classes}
      halls={halls}
      timetableEntries={timetableEntries}
      loadError={messages.join(" ")}
    />
  );
}
