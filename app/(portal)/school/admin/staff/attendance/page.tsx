import type { Metadata } from "next";
import { StaffAttendanceClient } from "@/components/staff/staff-attendance-client";
import { listTeacherAttendance, listStaffMemberAttendance } from "@/lib/api/staff-attendance";
import { listTeachers } from "@/lib/api/teachers";
import { listStaff } from "@/lib/api/staff";
import type {
  ApiStaffAttendanceEntry,
  ApiStaffDirectoryMember,
  ApiStaffMemberAttendanceEntry,
  ApiTeacher,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

async function loadTeachers(): Promise<ApiTeacher[]> {
  const teachers: ApiTeacher[] = [];
  let page = 1;
  let total = Infinity;
  while (teachers.length < total) {
    const result = await listTeachers({ page, limit: 100 });
    teachers.push(...result.data);
    total = result.total;
    page += 1;
    if (result.data.length === 0) break;
  }
  return teachers;
}

export const metadata: Metadata = {
  title: "Staff Attendance | School Admin",
};

export default async function Page() {
  const month = CURRENT_MONTH;
  let teachers: ApiTeacher[] = [];
  let members: ApiStaffDirectoryMember[] = [];
  let teacherEntries: ApiStaffAttendanceEntry[] = [];
  let memberEntries: ApiStaffMemberAttendanceEntry[] = [];
  const errors: string[] = [];

  const [
    teachersResult,
    membersResult,
    teacherEntriesResult,
    memberEntriesResult,
  ] = await Promise.all([
    loadTeachers()
      .then((value) => ({ ok: true as const, value }))
      .catch((cause) => ({ ok: false as const, cause })),
    listStaff()
      .then((value) => ({ ok: true as const, value }))
      .catch((cause) => ({ ok: false as const, cause })),
    listTeacherAttendance({ month })
      .then((value) => ({ ok: true as const, value }))
      .catch((cause) => ({ ok: false as const, cause })),
    listStaffMemberAttendance({ month })
      .then((value) => ({ ok: true as const, value }))
      .catch((cause) => ({ ok: false as const, cause })),
  ]);

  if (teachersResult.ok) teachers = teachersResult.value;
  else errors.push(academicErrorMessage(teachersResult.cause, "Unable to load teachers"));

  if (membersResult.ok) members = membersResult.value;
  else errors.push(academicErrorMessage(membersResult.cause, "Unable to load staff"));

  if (teacherEntriesResult.ok) teacherEntries = teacherEntriesResult.value;
  else errors.push(academicErrorMessage(teacherEntriesResult.cause, "Unable to load teacher attendance"));

  if (memberEntriesResult.ok) memberEntries = memberEntriesResult.value;
  else errors.push(academicErrorMessage(memberEntriesResult.cause, "Unable to load staff attendance"));

  return (
    <StaffAttendanceClient
      initialTeachers={teachers}
      initialMembers={members}
      initialTeacherEntries={teacherEntries}
      initialMemberEntries={memberEntries}
      initialMonth={month}
      initialError={errors.join(" · ")}
    />
  );
}
