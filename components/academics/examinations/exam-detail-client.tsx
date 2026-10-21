"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAcademicDate } from "@/lib/format";
import { listTeachers, fullName } from "@/lib/api/teachers";
import type { ApiExam, ApiExamSubject, ApiExamType, ApiTeacher } from "@/lib/api/types";
import { examStatusVariant } from "./exams-tab";
import { ExamResultsSection } from "./exam-results-section";

export function subjectLabel(subject: ApiExamSubject | null | undefined): string {
  const className = subject?.classSubject?.schoolClass?.className;
  const name = subject?.classSubject?.subject?.name ?? "Subject";
  return className ? `${name} · ${className}` : name;
}

function teacherLabel(
  subject: ApiExamSubject | null | undefined,
  teachers: ApiTeacher[],
): string {
  const embedded = subject?.classSubject?.teacher?.user;
  if (embedded) {
    return [embedded.firstName, embedded.lastName].filter(Boolean).join(" ") || "—";
  }
  const teacherId = subject?.classSubject?.teacherId;
  if (!teacherId) return "—";
  const match = teachers.find((t) => t.id === teacherId);
  return match ? fullName(match) : "—";
}

function distinctClassIds(exam: ApiExam | null): string[] {
  return Array.from(
    new Set(
      (exam?.examSubjects ?? [])
        .map((s) => s.classSubject?.classId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
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
    () => new Map(examTypes.map((t) => [t.id, t.name])),
    [examTypes],
  );

  const classIds = distinctClassIds(exam);
  const classNames = Array.from(
    new Set(
      subjects
        .map((s) => s.classSubject?.schoolClass?.className)
        .filter(Boolean) as string[],
    ),
  );
  // Group shape only drives the label; the backend derives nothing.
  const scope = classIds.length > 1 ? "MULTI_CLASS" : classIds.length === 1 ? "CLASS_WIDE" : "UNKNOWN";
  const targetLabel =
    classNames.length > 1 ? `${classNames[0]} +${classNames.length - 1} more` : classNames[0] ?? "—";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/academic/examinations" className="inline-flex items-center gap-1 hover:text-foreground">
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
          <Badge variant="outline">
            {scope === "MULTI_CLASS" ? "Multi-class" : scope === "CLASS_WIDE" ? "Class-wide" : "Unclassified"}
          </Badge>
          <span className="font-medium text-foreground/80">{targetLabel}</span>
          {exam?.examTypeId ? <Badge variant="secondary">{typeById.get(exam.examTypeId) ?? "Exam"}</Badge> : null}
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden />
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} across {classIds.length || 0} class
            {classIds.length === 1 ? "" : "es"}
          </span>
          {exam?.startsOn ? (
            <span>
              {formatAcademicDate(exam.startsOn)}
              {exam.endsOn && exam.endsOn !== exam.startsOn ? ` – ${formatAcademicDate(exam.endsOn)}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
          <SubjectsCard exam={exam} teachers={teachers} />
          <ExamResultsSection exam={exam} />
        </>
      ) : null}
    </div>
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
      <CardHeader>
        <CardTitle className="text-sm">Subjects &amp; teachers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border divide-y">
          {subjects.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{subjectLabel(s)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Teacher · {teacherLabel(s, teachers)}
                  {s.examDate ? ` · Paper ${formatAcademicDate(s.examDate)}` : ""}
                  {s.gradingScale?.name ? ` · Scale ${s.gradingScale.name}` : ""}
                  {(s.results?.length ?? 0) > 0 ? ` · ${s.results?.length} results` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Max {String(s.maxMarks)}</Badge>
                {s.passingMarks != null ? <Badge variant="outline">Pass {String(s.passingMarks)}</Badge> : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
