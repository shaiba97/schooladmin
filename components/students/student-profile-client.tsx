"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, GraduationCap, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentViewer } from "@/components/students/document-viewer";
import { StudentAvatar } from "@/components/students/student-avatar";
import type {
  ApiSchoolClass,
  ApiStudent,
  ApiStudentAttendanceRecord,
  ApiStudentGuardianLink,
  ApiTimetableEntry,
} from "@/lib/api/types";
import { currentClassLabel, studentFullName } from "@/lib/api/mappers";
import { toTitleCase } from "@/lib/text";
import { ageFromDob, formatAcademicDate } from "@/lib/format";
import { studentStatusBadgeVariant } from "@/lib/student-status";

/**
 * Mirrors the Academic Affairs student profile (components/students/
 * student-detail-client.tsx there) in read-only form: same header card,
 * Info rows, guardians table body, attendance summary math and document
 * slots — restructured into the prompt-spec's three tabs with every
 * action card, edit button and menu removed.
 */

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value ?? "—"}
    </p>
  );
}

const DOC_SLOTS: Array<{ type: string; title: string; required: boolean }> = [
  { type: "PROFILE_IMAGE", title: "Profile image", required: false },
  { type: "NATIONAL_NUMBER", title: "National number", required: true },
  { type: "NATIONAL_CARD", title: "National card", required: true },
  { type: "PASSPORT", title: "Passport", required: false },
];

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_KEYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function StudentProfileClient({
  student: initialStudent,
  error,
  initialGuardians,
  initialAttendance,
  initialClass,
  initialTimetable,
}: {
  student: ApiStudent | null;
  error?: string;
  initialGuardians: ApiStudentGuardianLink[];
  initialAttendance: ApiStudentAttendanceRecord[];
  initialClass: ApiSchoolClass | null;
  initialTimetable: ApiTimetableEntry[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState("personal");
  const student = initialStudent;

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description={error || "The student record could not be loaded."}
        action={{ label: "Back to Students", onClick: () => router.push("/academic/students") }}
      />
    );
  }

  const documents = student.documents ?? [];

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" className="px-0" onClick={() => router.push("/academic/students")}>
          <ArrowLeft size={14} /> Back to Students
        </Button>
        <div className="mt-3 flex items-start gap-4">
          <StudentAvatar student={student} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{toTitleCase(studentFullName(student))}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {student.roleNumber || "—"} · {currentClassLabel(student) === "—" ? "—" : currentClassLabel(student)} · {student.status || "—"}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <Badge variant={studentStatusBadgeVariant(student.status)}>{student.status}</Badge>
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal & Guardian Info</TabsTrigger>
          <TabsTrigger value="academic">Academic Record</TabsTrigger>
          <TabsTrigger value="documents">Documents & Files ({documents.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PersonalTab student={student} guardians={initialGuardians} />
        </TabsContent>
        <TabsContent value="academic">
          <AcademicTab student={student} schoolClass={initialClass} timetable={initialTimetable} attendance={initialAttendance} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab documents={documents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PersonalTab({ student, guardians }: { student: ApiStudent; guardians: ApiStudentGuardianLink[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Student Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Role number" value={<span className="font-mono text-xs">{student.roleNumber}</span>} />
            <Info label="Gender" value={student.gender ?? "—"} />
            <Info
              label="Date of birth"
              value={student.dateOfBirth ? formatAcademicDate(student.dateOfBirth) : "—"}
            />
            <Info label="Age" value={ageFromDob(student.dateOfBirth) != null ? String(ageFromDob(student.dateOfBirth)) : "—"} />
            {/* The student model has no blood-group field; the row stays per spec with an em-dash. */}
            <Info label="Blood group" value="—" />
            <Info label="Education level" value={student.educationLevel ?? "—"} />
            <Info label="Grade" value={student.grade ?? "—"} />
            <Info label="Mother" value={student.motherFullname ? toTitleCase(student.motherFullname) : "—"} />
            <Info label="Father" value={student.fatherFullname ? toTitleCase(student.fatherFullname) : "—"} />
            <Info label="Joined" value={formatAcademicDate(student.admissionDate ?? student.createdAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Residence address" value={student.address ?? "—"} />
            <Info label="Phone" value={student.phone ? <span className="font-mono text-xs">{student.phone}</span> : "—"} />
            <Info label="Former school" value={student.formerSchoolName ?? "—"} />
            <Info label="Transferred" value={student.isTransferred ? "Yes" : "No"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><UserRound size={14} aria-hidden /> Guardians</CardTitle>
        </CardHeader>
        <CardContent>
          {guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guardians on file. The stored father/mother names above are the only contact details on the list payload.</p>
          ) : (
            <GuardiansTable links={guardians} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type GuardianRow = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  guardianNumber: string;
  primary: boolean;
  emergency: boolean;
  canPickup: boolean;
};

function GuardiansTable({ links }: { links: ApiStudentGuardianLink[] }) {
  const rows: GuardianRow[] = links.map((link) => ({
    id: link.guardianId,
    name: toTitleCase(`${link.guardian.firstName} ${link.guardian.lastName ?? ""}`),
    relationship: link.relationship,
    phone: link.guardian.phone ?? "—",
    guardianNumber: link.guardian.guardianNumber ?? "—",
    primary: link.isPrimary,
    emergency: link.emergencyContact,
    canPickup: link.canPickup,
  }));
  const columns: Column<GuardianRow>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (row) => (
        <span>
          <span className="block font-medium">{row.name}</span>
          {toTitleCase(row.relationship) !== "Guardian" ? <span className="block text-xs font-normal text-muted-foreground">{toTitleCase(row.relationship)}</span> : null}
        </span>
      ),
      sortable: true,
    },
    { id: "guardianNumber", header: "Guardian ID", accessor: (row) => <span className="font-mono text-xs">{row.guardianNumber}</span> },
    { id: "phone", header: "Phone", accessor: (row) => <span className="font-mono text-xs">{row.phone}</span> },
    {
      id: "flags",
      header: "Flags",
      accessor: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.primary ? <Badge variant="secondary">Primary</Badge> : null}
          {row.emergency ? <Badge variant="warning">Emergency</Badge> : null}
          {row.canPickup ? <Badge variant="outline">Can pick up</Badge> : null}
          {!row.primary && !row.emergency && !row.canPickup ? <span className="text-muted-foreground">—</span> : null}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No guardians linked"
      emptyDescription="Guardian records appear here once linked in the Academic portal."
    />
  );
}

function AcademicTab({
  student,
  schoolClass,
  timetable,
  attendance,
}: {
  student: ApiStudent;
  schoolClass: ApiSchoolClass | null;
  timetable: ApiTimetableEntry[];
  attendance: ApiStudentAttendanceRecord[];
}) {
  // Attendance rule (mirrored from the academic AttendanceTab): PRESENT +
  // LATE count as attended; EXCUSED sessions are excluded from the rate
  // denominator; unknown statuses count toward the total but not attended.
  const summary = React.useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let other = 0;
    for (const record of attendance) {
      if (record.status === "PRESENT") present++;
      else if (record.status === "ABSENT") absent++;
      else if (record.status === "LATE") late++;
      else if (record.status === "EXCUSED") excused++;
      else other++;
    }
    const total = present + absent + late + excused + other;
    const denominator = total - excused;
    return {
      total,
      present,
      absent,
      late,
      excused,
      percentage: denominator > 0 ? Math.round(((present + late) / denominator) * 100) : 0,
    };
  }, [attendance]);

  const periods = React.useMemo(
    () => timetable.filter((entry) => !entry.isBreak).sort((a, b) => a.periodNo - b.periodNo),
    [timetable],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap size={14} aria-hidden /> Homeroom & Enrollment</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Class" value={currentClassLabel(student) === "—" ? "—" : currentClassLabel(student)} />
            <Info label="Track" value={
              (() => {
                const track = student.enrollments?.[0]?.schoolClass?.track;
                if (!track) return "—";
                return <Badge variant="outline">{track === "SCIENCE" ? "Science" : "Art"}</Badge>;
              })()
            } />
            <Info label="Education level" value={student.educationLevel ?? "—"} />
            <Info label="Enrollment status" value={student.enrollments?.[0]?.status ?? "—"} />
            <Info label="Homeroom teacher" value={schoolClass?.classTeacher?.user ? toTitleCase(`${schoolClass.classTeacher.user.firstName} ${schoolClass.classTeacher.user.lastName ?? ""}`) : "—"} />
            <Info label="Class size" value={schoolClass?.counts?.students != null ? String(schoolClass.counts.students) : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Attendance Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-semibold">{summary.percentage}%</p>
                <p className="text-xs text-muted-foreground">Attendance rate</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-sm"><span className="block text-lg font-semibold">{summary.absent}</span><span className="text-xs text-muted-foreground">Days absent</span></p>
                <p className="text-sm"><span className="block text-lg font-semibold">{summary.late}</span><span className="text-xs text-muted-foreground">Days late</span></p>
                <p className="text-sm"><span className="block text-lg font-semibold">{summary.excused}</span><span className="text-xs text-muted-foreground">Excused</span></p>
                <p className="text-sm"><span className="block text-lg font-semibold">{summary.total}</span><span className="text-xs text-muted-foreground">Sessions recorded</span></p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">EXCUSED sessions are excluded from the rate denominator, matching the Academic portal.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays size={14} aria-hidden /> Class Schedule</CardTitle></CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No regular timetable periods published for this student&apos;s class yet.</p>
          ) : (
            <div className="space-y-2">
              {DAY_KEYS.map((day, index) => {
                const dayEntries = periods.filter((entry) => entry.dayOfWeek.toUpperCase().startsWith(day.slice(0, 3)));
                if (dayEntries.length === 0) return null;
                return (
                  <div key={day} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">{DAY_LABELS[index]}</p>
                    <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                      {dayEntries.map((entry) => (
                        <li key={entry.id} className="flex flex-wrap gap-x-2">
                          <span className="font-mono text-xs text-muted-foreground">P{entry.periodNo}</span>
                          <span className="font-medium">{entry.subject?.name ?? "—"}</span>
                          <span className="text-muted-foreground">
                            {entry.teacher?.user ? `· ${toTitleCase(`${entry.teacher.user.firstName} ${entry.teacher.user.lastName ?? ""}`)}` : ""}
                            {entry.room ? ` · ${entry.room}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab({ documents }: { documents: NonNullable<ApiStudent["documents"]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DOC_SLOTS.map((slot) => {
        const doc = documents.find((d) => d.documentType === slot.type);
        if (!doc) {
          return (
            <Card key={slot.type}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {slot.required ? "Required — not provided" : "Not provided"}
                </p>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card key={slot.type}>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-sm font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
              </div>
              <DocumentViewer document={doc} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
