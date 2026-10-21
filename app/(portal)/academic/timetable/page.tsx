import { TimetableClient } from "@/components/academics/timetable/timetable-client";
import { listClasses } from "@/lib/api/classes";
import { listSubjects } from "@/lib/api/subjects";
import { listTeachers } from "@/lib/api/teachers";
import { listTimetableForYear } from "@/lib/api/timetable";
import type { ApiSchoolClass, ApiSubject, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;

  const [classResult, subjectResult, teacherResult, timetableResult] = await Promise.allSettled([
    listClasses({ page: 1, limit: 999 }),
    listSubjects({ page: 1, limit: 999 }),
    listTeachers({ page: 1, limit: 999 }),
    listTimetableForYear(),
  ]);

  const classes: ApiSchoolClass[] = classResult.status === "fulfilled" ? classResult.value.data : [];
  const subjects: ApiSubject[] = subjectResult.status === "fulfilled" ? subjectResult.value.data : [];
  const teachers: ApiTeacher[] = teacherResult.status === "fulfilled" ? teacherResult.value.data : [];
  const yearEntries: ApiTimetableEntry[] = timetableResult.status === "fulfilled" ? timetableResult.value : [];

  const messages: string[] = [];
  if (classResult.status === "rejected") messages.push(academicErrorMessage(classResult.reason, "Unable to load classes"));
  if (subjectResult.status === "rejected") messages.push(academicErrorMessage(subjectResult.reason, "Unable to load subjects"));
  if (teacherResult.status === "rejected") messages.push(academicErrorMessage(teacherResult.reason, "Unable to load teachers"));
  if (timetableResult.status === "rejected") messages.push(academicErrorMessage(timetableResult.reason, "Unable to load timetables"));

  return (
    <TimetableClient
      initialTab={Array.isArray(tab) ? tab[0] : tab}
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      yearEntries={yearEntries}
      refsError={messages.join(" ")}
    />
  );
}
