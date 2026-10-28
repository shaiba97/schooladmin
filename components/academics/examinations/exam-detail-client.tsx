"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  DoorOpen,
  GraduationCap,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAcademicDate } from "@/lib/format";
import { fullName, listTeachers } from "@/lib/api/teachers";
import type { ApiExam, ApiExamSubject, ApiExamType, ApiTeacher } from "@/lib/api/types";
import { examStatusVariant } from "./exams-tab";
import { ExamResultsSection } from "./exam-results-section";

export function subjectLabel(subject: ApiExamSubject | null | undefined): string {
  const className = subject?.classSubject?.schoolClass?.className;
  const name = subject?.classSubject?.subject?.name ?? "Subject";
  return className ? `${name} · ${className}` : name;
}

function teacherLabel(subject: ApiExamSubject | null | undefined, teachers: ApiTeacher[]): string {
  const embedded = subject?.classSubject?.teacher?.user;
  if (embedded) {
    return [embedded.firstName, embedded.lastName].filter(Boolean).join(" ") || "—";
  }
  const teacherId = subject?.classSubject?.teacherId;
  if (!teacherId) return "—";
  const match = teachers.find((teacher) => teacher.id === teacherId);
  return match ? fullName(match) : "—";
}

function distinctClassIds(exam: ApiExam | null): string[] {
  return Array.from(
    new Set(
      (exam?.examSubjects ?? [])
        .map((subject) => subject.classSubject?.classId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

function conductedBy(
  exam: ApiExam | null,
  teachers: ApiTeacher[],
): { label: string; kind: "Teacher" | "Academic Affairs"; userId?: string } {
  const author = exam?.author;
  if (!author) return { label: "Academic Affairs", kind: "Academic Affairs" };
  const teacher = teachers.find(
    (entry) => entry.user?.id === author.id || entry.id === author.id,
  );
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  if (teacher) {
    return { label: name || fullName(teacher), kind: "Teacher", userId: author.id };
  }
  return { label: "Academic Affairs", kind: "Academic Affairs" };
}

const GRADE_LABELS: Record<number, string> = {
  1: "1st Secondary",
  2: "2nd Secondary",
  3: "3rd Secondary",
  6: "6th Intermediate",
  7: "7th Intermediate",
  8: "8th Intermediate",
  9: "9th Intermediate",
};

function examTarget(exam: ApiExam | null): {
  level: string;
  grade: string;
  track: string | null;
} {
  for (const subject of exam?.examSubjects ?? []) {
    const schoolClass = subject.classSubject?.schoolClass;
    if (!schoolClass) continue;
    return {
      level:
        schoolClass.educationLevel === "SECONDARY"
          ? "Secondary"
          : schoolClass.educationLevel === "INTERMEDIATE"
            ? "Intermediate"
            : "—",
      grade:
        schoolClass.grade != null
          ? GRADE_LABELS[schoolClass.grade] ?? `Grade ${schoolClass.grade}`
          : "—",
      track: schoolClass.track ?? null,
    };
  }
  return { level: "—", grade: "—", track: null };
}

export function ExamDetailClient({
  initialExam,
  examTypes,
  loadError,
}: {
  initialExam: ApiExam | null;
  examTypes: ApiExamType[];
  loadError: string;
}) {
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);

  React.useEffect(() => {
    let active = true;
    listTeachers({ limit: 200 })
      .then((page) => {
        if (active) setTeachers(page.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const exam = initialExam;
  const examId = exam?.id ?? "";
  const subjects = exam?.examSubjects ?? [];
  const typeById = React.useMemo(
    () => new Map(examTypes.map((type) => [type.id, type.name])),
    [examTypes],
  );

  const classIds = distinctClassIds(exam);
  const classNames = Array.from(
    new Set(
      subjects
        .map((subject) => subject.classSubject?.schoolClass?.className)
        .filter(Boolean) as string[],
    ),
  );
  const scope =
    classIds.length > 1 ? "Multi-class" : classIds.length === 1 ? "Class-wide" : "Unclassified";
  const targetLabel =
    classNames.length > 1 ? `${classNames[0]} +${classNames.length - 1} more` : classNames[0] ?? "—";
  const rooms = exam?.examRoomAssignments ?? [];
  const conducted = conductedBy(exam, teachers);
  const target = examTarget(exam);
  const seatedCount = rooms.reduce((sum, room) => sum + (room.students?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/school/admin/exams" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft size={14} aria-hidden /> Examination Center
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono">{examId.slice(0, 8) || "…"}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{exam?.name ?? "Exam"}</h1>
          {exam?.status ? <Badge variant={examStatusVariant(exam.status)}>{exam.status}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <Badge variant="outline">{scope}</Badge>
          <span className="font-medium text-foreground/80">{targetLabel}</span>
          {exam?.examTypeId ? (
            <Badge variant="secondary">{typeById.get(exam.examTypeId) ?? "Exam"}</Badge>
          ) : null}
          {exam?.startsOn ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} aria-hidden />
              {formatAcademicDate(exam.startsOn)}
              {exam.endsOn && exam.endsOn !== exam.startsOn
                ? ` – ${formatAcademicDate(exam.endsOn)}`
                : ""}
            </span>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {loadError}
        </p>
      ) : null}

      {!exam && !loadError ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : exam ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Fact icon={GraduationCap} label="Educational level" value={target.level} />
            <Fact
              icon={GraduationCap}
              label="Grade"
              value={target.grade}
              hint={target.track ? (target.track === "SCIENCE" ? "Science" : "Art") : undefined}
            />
            <Fact
              icon={Users}
              label="Students sat"
              value={seatedCount > 0 ? String(seatedCount) : "—"}
              hint={classIds.length > 0 ? `${classIds.length} class${classIds.length === 1 ? "" : "es"}` : undefined}
            />
            <Fact
              icon={ShieldCheck}
              label="Conducted by"
              value={conducted.kind}
              hint={conducted.kind === "Teacher" ? conducted.label : "Examination office"}
            />
          </div>

          <SubjectsCard exam={exam} teachers={teachers} />
          <InvigilatorsCard exam={exam} teachers={teachers} />
          <RoomsCard exam={exam} teachers={teachers} />
          <SeatedStudentsCard exam={exam} />
          <ExamResultsSection exam={exam} />
        </>
      ) : null}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectsCard({ exam, teachers }: { exam: ApiExam; teachers: ApiTeacher[] }) {
  const subjects = exam.examSubjects ?? [];

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subjects &amp; teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No subject papers are attached to this exam.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Subjects &amp; teachers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border divide-y">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subjectLabel(subject)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <UserRound size={11} className="me-1 inline" aria-hidden />
                  {teacherLabel(subject, teachers)}
                  {subject.examDate ? ` · Paper ${formatAcademicDate(subject.examDate)}` : ""}
                  {subject.gradingScale?.name ? ` · Scale ${subject.gradingScale.name}` : ""}
                  {subject.sampleObjectKey ? " · Sample attached" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Max {String(subject.maxMarks)}</Badge>
                {subject.passingMarks != null ? (
                  <Badge variant="outline">Pass {String(subject.passingMarks)}</Badge>
                ) : null}
                <Badge variant="secondary">
                  {subject.results?.length ?? 0} result{(subject.results?.length ?? 0) === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InvigilatorsCard({ exam, teachers }: { exam: ApiExam; teachers: ApiTeacher[] }) {
  const rows = (exam.examRoomAssignments ?? []).flatMap((room) =>
    (room.invigilators ?? []).map((invigilator) => {
      const teacher =
        invigilator.teacher ??
        teachers.find((entry) => entry.id === invigilator.teacherId) ??
        null;
      return {
        id: invigilator.id,
        name: teacher ? fullName(teacher) : "Invigilator",
        room: room.hall?.name ?? "Room",
        employeeNumber: teacher?.employeeNumber ?? null,
      };
    }),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Invigilators</CardTitle>
          <p className="text-xs text-muted-foreground">
            {rows.length} assignment{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invigilators assigned yet. Assign them from the Room Wizard.
          </p>
        ) : (
          <div className="rounded-lg border divide-y">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  {row.employeeNumber ? (
                    <span className="text-xs text-muted-foreground">#{row.employeeNumber}</span>
                  ) : null}
                </div>
                <Badge variant="secondary">{row.room}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeatedStudentsCard({ exam }: { exam: ApiExam }) {
  const rows: {
    id: string;
    name: string;
    roleNumber: string;
    room: string;
    seat: number | null;
  }[] = [];
  const seen = new Set<string>();

  for (const room of exam.examRoomAssignments ?? []) {
    for (const [index, seat] of (room.students ?? []).entries()) {
      const studentId = seat.student?.id;
      if (studentId) seen.add(studentId);
      rows.push({
        id: seat.id,
        name:
          [seat.student?.firstName, seat.student?.lastName].filter(Boolean).join(" ") || "—",
        roleNumber: seat.student?.roleNumber ?? "—",
        room: room.hall?.name ?? "Room",
        seat: index + 1,
      });
    }
  }

  // Students can have marks without a seating record; still list every candidate.
  for (const subject of exam.examSubjects ?? []) {
    for (const result of subject.results ?? []) {
      const studentId = result.student?.id ?? result.studentId;
      if (!studentId || seen.has(studentId)) continue;
      seen.add(studentId);
      rows.push({
        id: `result:${result.id}`,
        name:
          [result.student?.firstName, result.student?.lastName].filter(Boolean).join(" ") || "—",
        roleNumber: result.student?.roleNumber ?? "—",
        room: "Not seated",
        seat: null,
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Students who sat the exam</CardTitle>
          <p className="text-xs text-muted-foreground">
            {rows.length} candidate{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No candidates seated yet. Assign rooms and seat students from the Room Wizard.
          </p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">Student full name</th>
                  <th className="px-3 py-2 text-start font-medium">Roll No</th>
                  <th className="px-3 py-2 text-start font-medium">Room</th>
                  <th className="px-3 py-2 text-end font-medium">Seat</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.roleNumber}</td>
                    <td className="px-3 py-2">{row.room}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{row.seat ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomsCard({ exam, teachers }: { exam: ApiExam; teachers: ApiTeacher[] }) {
  const rooms = exam.examRoomAssignments ?? [];
  const studentCount = rooms.reduce((sum, room) => sum + (room.students?.length ?? 0), 0);

  if (rooms.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rooms &amp; seating</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={DoorOpen}
            title="No rooms assigned"
            description="Assign rooms in the Exam Wizard, or manage seating from the Room Wizard."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Rooms &amp; seating</CardTitle>
          <p className="text-xs text-muted-foreground">
            {rooms.length} room{rooms.length === 1 ? "" : "s"} · {studentCount} candidate
            {studentCount === 1 ? "" : "s"} seated
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rooms.map((room) => {
          const invigilators = room.invigilators ?? [];
          return (
            <div key={room.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{room.hall?.name ?? "Room"}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.students?.length ?? 0} seated · capacity {room.hall?.capacity ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {invigilators.length === 0 ? (
                    <Badge variant="warning">No invigilator</Badge>
                  ) : (
                    invigilators.map((invigilator) => {
                      const teacher = invigilator.teacher;
                      const name = teacher
                        ? fullName(teacher)
                        : teachers.find((entry) => entry.id === invigilator.teacherId)
                          ? fullName(teachers.find((entry) => entry.id === invigilator.teacherId)!)
                          : "Invigilator";
                      return (
                        <Badge key={invigilator.id} variant="secondary">
                          <ShieldCheck size={11} className="me-1" aria-hidden />
                          {name}
                        </Badge>
                      );
                    })
                  )}
                  {room.hallId ? (
                    <Link
                      href={`/school/admin/exams/rooms/${room.hallId}`}
                      className="text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Manage seating
                    </Link>
                  ) : null}
                </div>
              </div>
              {(room.students?.length ?? 0) > 0 ? (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-start font-medium">Seat</th>
                        <th className="px-2 py-1.5 text-start font-medium">Candidate</th>
                        <th className="px-2 py-1.5 text-start font-medium">Roll No</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(room.students ?? []).map((seat, index) => (
                        <tr key={seat.id}>
                          <td className="px-2 py-1 tabular-nums text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-2 py-1 font-medium">
                            {[seat.student?.firstName, seat.student?.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </td>
                          <td className="px-2 py-1 text-muted-foreground">
                            {seat.student?.roleNumber ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
