import { ExamWizardForm } from "@/components/academics/examinations/exam-wizard-form";
import { listAcademicYears } from "@/lib/api/academic-years";
import { listClasses } from "@/lib/api/classes";
import { listExamTypes } from "@/lib/api/exam-types";
import { listHalls } from "@/lib/api/halls";
import type {
  ApiAcademicYear,
  ApiExamType,
  ApiHall,
  ApiPaginated,
  ApiSchoolClass,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page() {
  const [yearsResult, classesResult, typesResult, hallsResult] = await Promise.allSettled([
    listAcademicYears({ page: 1, limit: 100 }),
    listClasses({ page: 1, limit: 999 }),
    listExamTypes(),
    listHalls(),
  ]);

  const years: ApiAcademicYear[] =
    yearsResult.status === "fulfilled" ? yearsResult.value.data : [];
  const classes: ApiSchoolClass[] =
    classesResult.status === "fulfilled" ? (classesResult.value as ApiPaginated<ApiSchoolClass>).data : [];
  const examTypes: ApiExamType[] = typesResult.status === "fulfilled" ? typesResult.value : [];
  const halls: ApiHall[] = hallsResult.status === "fulfilled" ? hallsResult.value : [];

  const messages: string[] = [];
  if (yearsResult.status === "rejected") {
    messages.push(academicErrorMessage(yearsResult.reason, "Unable to load academic years"));
  }
  if (classesResult.status === "rejected") {
    messages.push(academicErrorMessage(classesResult.reason, "Unable to load classes"));
  }
  if (typesResult.status === "rejected") {
    messages.push(academicErrorMessage(typesResult.reason, "Unable to load exam types"));
  }
  if (hallsResult.status === "rejected") {
    messages.push(academicErrorMessage(hallsResult.reason, "Unable to load rooms"));
  }

  return (
    <div className="space-y-4">
      {messages.length > 0 ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {messages.join(" ")}
        </p>
      ) : null}
      <ExamWizardForm years={years} classes={classes} examTypes={examTypes} halls={halls} />
    </div>
  );
}
