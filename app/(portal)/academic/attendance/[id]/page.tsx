import { AttendanceDetailClient, type DetailRecord } from "@/components/academics/attendance/attendance-detail-client";
import { listStaff } from "@/lib/api/staff";
import { listStaffMemberAttendance, listTeacherAttendance } from "@/lib/api/staff-attendance";
import { getStudent, listStudentAttendanceRecords } from "@/lib/api/students";
import { getTeacher } from "@/lib/api/teachers";
import { listTimetableForYear } from "@/lib/api/timetable";
import type { ApiStaffAttendanceEntry, ApiStaffMemberAttendanceEntry, ApiStaffDirectoryMember, ApiStudent, ApiStudentAttendanceRecord, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";
import { dateKeyOf } from "@/components/academics/attendance/workdays";

const TYPES = ["student", "teacher", "staff"] as const;
type DetailType = (typeof TYPES)[number];

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const type: DetailType = TYPES.includes(first(query.type) as DetailType) ? (first(query.type) as DetailType) : "student";

  const [timetableResult, profileResult, recordsResult] = await Promise.allSettled([
    listTimetableForYear({ timetableType: "REGULAR" }),
    type === "student" ? getStudent(id) : type === "teacher" ? getTeacher(id) : listStaff(),
    type === "student"
      ? listStudentAttendanceRecords(id)
      : type === "teacher"
        ? listTeacherAttendance({ teacherId: id })
        : listStaffMemberAttendance({ userId: id }),
  ]);

  const timetableEntries: ApiTimetableEntry[] = timetableResult.status === "fulfilled" ? timetableResult.value : [];

  let name = "Unknown";
  const lines: string[] = [];
  let notFound = false;

  if (profileResult.status === "fulfilled") {
    const payload = profileResult.value as ApiStudent | ApiTeacher | ApiStaffDirectoryMember[];
    if (type === "student") {
      const student = payload as ApiStudent;
      name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
      if (student.roleNumber) lines.push(`Roll ${student.roleNumber}`);
      const active = student.enrollments?.find((e) => e.status === "ACTIVE" && e.schoolClass);
      if (active?.schoolClass) lines.push(active.schoolClass.className);
    } else if (type === "teacher") {
      const teacher = payload as ApiTeacher;
      name = teacher.user ? [teacher.user.firstName, teacher.user.lastName].filter(Boolean).join(" ") : teacher.employeeNumber ?? "(unnamed teacher)";
      if (teacher.employeeNumber) lines.push(`Teacher · ${teacher.employeeNumber}`);
      if (teacher.department?.name) lines.push(teacher.department.name);
      if (teacher.hireDate) lines.push(`Joined ${teacher.hireDate.slice(0, 10)}`);
    } else {
      const member = (payload as ApiStaffDirectoryMember[]).find((entry) => entry.id === id);
      if (member) {
        name = [member.firstName, member.lastName].filter(Boolean).join(" ");
        if (member.positionTitle ?? member.position) lines.push(member.positionTitle ?? member.position ?? "");
        if (member.staffNumber) lines.push(member.staffNumber);
      } else {
        notFound = true;
      }
    }
  } else {
    notFound = true;
  }

  let records: DetailRecord[] = [];
  if (recordsResult.status === "fulfilled") {
    if (type === "student") {
      records = (recordsResult.value as ApiStudentAttendanceRecord[])
        .filter((record) => record.attendanceSession?.attendanceDate)
        .map((record) => ({
          dateKey: dateKeyOf(record.attendanceSession.attendanceDate),
          status: record.status,
        }));
    } else if (type === "teacher") {
      records = (recordsResult.value as ApiStaffAttendanceEntry[]).map((entry) => ({
        dateKey: dateKeyOf(entry.attendanceDate),
        status: entry.status,
        remarks: entry.remarks,
        leftAt: entry.leftAt,
      }));
    } else {
      records = (recordsResult.value as ApiStaffMemberAttendanceEntry[]).map((entry) => ({
        dateKey: dateKeyOf(entry.attendanceDate),
        status: entry.status,
        remarks: entry.remarks,
        leftAt: entry.leftAt,
      }));
    }
  }
  records.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  // First one per date wins (the sort above keeps the latest).
  records = [...new Map(records.map((r) => [r.dateKey, r])).values()];

  const messages: string[] = [];
  if (timetableResult.status === "rejected") messages.push(academicErrorMessage(timetableResult.reason, "Unable to load the timetable"));
  if (recordsResult.status === "rejected") messages.push(academicErrorMessage(recordsResult.reason, "Unable to load attendance records"));

  return (
    <AttendanceDetailClient
      type={type}
      member={{ name, initials: initialsOf(name), lines, notFound }}
      records={records}
      schoolDays={timetableEntries.filter((entry) => !entry.isBreak).map((entry) => entry.dayOfWeek)}
      loadError={messages.join(" ")}
    />
  );
}
