import { TeachersDirectoryClient } from "@/components/teachers/teachers-directory-client";
import { listTeachers } from "@/lib/api/teachers";
import { listDepartments } from "@/lib/api/departments";
import { academicErrorMessage } from "@/lib/format";
import type { ApiDepartment, ApiPaginated, ApiTeacher } from "@/lib/api/types";

export default async function AcademicTeachersPage() {
  let data: ApiPaginated<ApiTeacher>;
  let departments: ApiDepartment[] = [];
  let initialError: string | undefined;
  let departmentsError: string | undefined;

  const [teachersResult, departmentsResult] = await Promise.allSettled([
    listTeachers({ page: 1, limit: 100 }),
    listDepartments(),
  ]);

  if (teachersResult.status === "fulfilled") {
    data = teachersResult.value;
  } else {
    data = { data: [], total: 0, page: 1, limit: 100 };
    initialError = academicErrorMessage(teachersResult.reason, "Unable to load teachers");
  }

  if (departmentsResult.status === "fulfilled") {
    departments = departmentsResult.value;
  } else {
    departmentsError = academicErrorMessage(departmentsResult.reason, "Unable to load departments");
  }

  return (
    <TeachersDirectoryClient
      initialData={data}
      departments={departments}
      initialError={initialError}
      departmentsError={departmentsError}
    />
  );
}
