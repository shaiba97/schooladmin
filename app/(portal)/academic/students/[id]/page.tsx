import { StudentProfileClient } from "@/components/students/student-profile-client";
import {
  getStudent,
  listStudentAttendanceRecords,
  listStudentGuardians,
} from "@/lib/api/students";
import { getClass } from "@/lib/api/classes";
import { listTimetableForClass } from "@/lib/api/timetable";
import type { ApiStudent } from "@/lib/api/types";

type Params = Promise<{ id: string }>;

export default async function StudentProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  let student: ApiStudent | null = null;
  let errorMessage: string | undefined;
  try {
    student = await getStudent(id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load student";
  }

  const classId = student?.enrollments?.[0]?.schoolClass?.id;
  const [guardiansResult, attendanceResult, classResult, timetableResult] =
    await Promise.allSettled([
      student ? listStudentGuardians(id) : Promise.resolve([]),
      student ? listStudentAttendanceRecords(id) : Promise.resolve([]),
      student && classId ? getClass(classId) : Promise.resolve(null),
      student && classId ? listTimetableForClass(classId, { timetableType: "REGULAR" }) : Promise.resolve([]),
    ]);

  return (
    <StudentProfileClient
      student={student}
      error={errorMessage}
      initialGuardians={guardiansResult.status === "fulfilled" ? guardiansResult.value : []}
      initialAttendance={attendanceResult.status === "fulfilled" ? attendanceResult.value : []}
      initialClass={classResult.status === "fulfilled" ? classResult.value : null}
      initialTimetable={timetableResult.status === "fulfilled" ? timetableResult.value : []}
    />
  );
}
