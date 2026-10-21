import { TeacherProfileClient } from "@/components/teachers/teacher-profile-client";
import { getTeacher } from "@/lib/api/teachers";
import { listDepartments } from "@/lib/api/departments";
import { academicErrorMessage } from "@/lib/format";
import type { ApiDepartment, ApiTeacher } from "@/lib/api/types";

export default async function AcademicTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let teacher: ApiTeacher | null = null;
  let errorMessage: string | undefined;
  const [teacherResult, departmentsResult] = await Promise.allSettled([
    getTeacher(id),
    listDepartments(),
  ]);

  if (teacherResult.status === "fulfilled") {
    teacher = teacherResult.value;
  } else {
    errorMessage = academicErrorMessage(teacherResult.reason, "Unable to load teacher");
  }

  let departments: ApiDepartment[] = [];
  let departmentsError: string | undefined;
  if (departmentsResult.status === "fulfilled") {
    departments = departmentsResult.value;
  } else {
    departmentsError = academicErrorMessage(departmentsResult.reason, "Unable to load departments");
  }

  if (!teacher) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Teacher not found.</p>
        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <TeacherProfileClient
      teacher={teacher}
      departments={departments}
      departmentsError={departmentsError}
    />
  );
}
