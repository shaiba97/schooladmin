import { AttendanceWorkspaceClient } from "@/components/academics/attendance/attendance-workspace-client";
import { fetchWeekBundle } from "@/components/academics/attendance/week-bundle";
import { addDays, todayKey } from "@/components/academics/attendance/workdays";
import { listClasses } from "@/lib/api/classes";
import { listStaff } from "@/lib/api/staff";
import { listStudents } from "@/lib/api/students";
import { listTeachers } from "@/lib/api/teachers";
import { listTimetableForYear } from "@/lib/api/timetable";
import type { ApiSchoolClass, ApiStaffDirectoryMember, ApiStudent, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

const TAB_IDS = ["students", "teachers", "staff"] as const;
type TabId = (typeof TAB_IDS)[number];

const WEEK_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the week containing `key` (same math as workdays.weekWindow). */
function mondayOf(key: string): string {
  return addDays(key, -((new Date(`${key}T00:00:00.000Z`).getUTCDay() + 6) % 7));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; week?: string | string[]; class?: string | string[] }>;
}) {
  const query = await searchParams;
  const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const tabParam = first(query.tab);
  const weekParam = first(query.week);
  const classParam = first(query.class);

  const initialTab: TabId = TAB_IDS.includes(tabParam as TabId) ? (tabParam as TabId) : "students";
  const initialWeek = weekParam && WEEK_PATTERN.test(weekParam) ? mondayOf(weekParam) : mondayOf(todayKey());
  const initialClass = classParam;

  const [classResult, studentResult, teacherResult, staffResult, timetableResult, weekResult] = await Promise.allSettled([
    listClasses({ page: 1, limit: 100 }),
    listStudents({ page: 1, limit: 999 }),
    listTeachers({ page: 1, limit: 999 }),
    listStaff(),
    listTimetableForYear({ timetableType: "REGULAR" }),
    fetchWeekBundle(initialWeek, initialClass),
  ]);

  const classes: ApiSchoolClass[] = classResult.status === "fulfilled" ? classResult.value.data : [];
  const students: ApiStudent[] = studentResult.status === "fulfilled" ? studentResult.value.data : [];
  const teachers: ApiTeacher[] = teacherResult.status === "fulfilled" ? teacherResult.value.data : [];
  const staff: ApiStaffDirectoryMember[] = staffResult.status === "fulfilled" ? staffResult.value : [];
  const timetableEntries: ApiTimetableEntry[] = timetableResult.status === "fulfilled" ? timetableResult.value : [];
  const week = weekResult.status === "fulfilled" ? weekResult.value : undefined;

  const messages: string[] = [];
  if (classResult.status === "rejected") messages.push(academicErrorMessage(classResult.reason, "Unable to load classes"));
  if (studentResult.status === "rejected") messages.push(academicErrorMessage(studentResult.reason, "Unable to load students"));
  if (teacherResult.status === "rejected") messages.push(academicErrorMessage(teacherResult.reason, "Unable to load teachers"));
  if (staffResult.status === "rejected") messages.push(academicErrorMessage(staffResult.reason, "Unable to load the staff directory"));
  if (timetableResult.status === "rejected") messages.push(academicErrorMessage(timetableResult.reason, "Unable to load the timetable"));
  if (weekResult.status === "rejected") messages.push(academicErrorMessage(weekResult.reason, "Unable to load attendance for this week"));
  if (week && week.failures.length > 0) messages.push(`Unable to load ${week.failures.join(", ")} — showing what loaded.`);

  return (
    <AttendanceWorkspaceClient
      key={`${initialWeek}|${initialClass ?? ""}`}
      initialTab={initialTab}
      initialWeek={initialWeek}
      initialClass={initialClass}
      classes={classes}
      students={students}
      teachers={teachers}
      staff={staff}
      timetableEntries={timetableEntries}
      week={
        week ?? { rows: [], teacherEntries: [], memberEntries: [], failures: [] }
      }
      loadError={messages.join(" ")}
    />
  );
}
