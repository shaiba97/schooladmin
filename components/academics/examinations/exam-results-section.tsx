"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApiExam, ApiExamSubject, ApiStudentResult } from "@/lib/api/types";

const GRADE_LABELS: Record<number, string> = {
  1: "1st Secondary",
  2: "2nd Secondary",
  3: "3rd Secondary",
  6: "6th Intermediate",
  7: "7th Intermediate",
  8: "8th Intermediate",
  9: "9th Intermediate",
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function levelLabel(level: string | null | undefined): string {
  if (level === "SECONDARY") return "Secondary";
  if (level === "INTERMEDIATE") return "Intermediate";
  return "Unassigned level";
}

function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "Unassigned grade";
  return GRADE_LABELS[grade] ?? `Grade ${grade}`;
}

function studentName(result: ApiStudentResult): string {
  const name = result.student;
  return [name?.firstName, name?.lastName].filter(Boolean).join(" ").trim() || "Unnamed student";
}

type MatrixRow = {
  studentId: string;
  name: string;
  roleNumber: string;
  classNames: Set<string>;
  bySubject: Map<string, ApiStudentResult>;
};

type MatrixColumn = {
  name: string;
  maxMarks: number | null;
};

type GradeGroup = {
  key: string;
  level: string | null;
  grade: number | null;
  rows: MatrixRow[];
  columns: MatrixColumn[];
};

function subjectName(subject: ApiExamSubject): string {
  return subject.classSubject?.subject?.name ?? "Subject";
}

/**
 * Results for a single exam, grouped by grade rather than class so students
 * from every class of the grade share one matrix. Students are rows, subjects
 * are columns — the same shape as the Results Wizard.
 */
export function ExamResultsSection({ exam }: { exam: ApiExam }) {
  const groups = React.useMemo<GradeGroup[]>(() => {
    const map = new Map<
      string,
      {
        level: string | null;
        grade: number | null;
        rowMap: Map<string, MatrixRow>;
        columnMap: Map<string, MatrixColumn>;
      }
    >();

    for (const subject of exam.examSubjects ?? []) {
      const schoolClass = subject.classSubject?.schoolClass;
      const level = schoolClass?.educationLevel ?? null;
      const grade = schoolClass?.grade ?? null;
      const key = `${level ?? "none"}:${grade ?? "none"}`;
      let group = map.get(key);
      if (!group) {
        group = { level, grade, rowMap: new Map(), columnMap: new Map() };
        map.set(key, group);
      }

      const name = subjectName(subject);
      const maxMarks = toNumber(subject.maxMarks);
      const existingColumn = group.columnMap.get(name);
      if (!existingColumn) {
        group.columnMap.set(name, { name, maxMarks });
      } else if (existingColumn.maxMarks == null && maxMarks != null) {
        existingColumn.maxMarks = maxMarks;
      }

      for (const result of subject.results ?? []) {
        const studentId = result.student?.id ?? result.studentId;
        if (!studentId) continue;
        let row = group.rowMap.get(studentId);
        if (!row) {
          row = {
            studentId,
            name: studentName(result),
            roleNumber: result.student?.roleNumber ?? "—",
            classNames: new Set(),
            bySubject: new Map(),
          };
          group.rowMap.set(studentId, row);
        }
        if (schoolClass?.className) row.classNames.add(schoolClass.className);
        const previous = row.bySubject.get(name);
        const previousCreated = previous ? new Date(previous.createdAt ?? 0).getTime() : -1;
        if (!previous || previousCreated <= new Date(result.createdAt ?? 0).getTime()) {
          row.bySubject.set(name, result);
        }
      }
    }

    return [...map.entries()]
      .sort((a, b) => {
        const gradeA = a[1].grade ?? 999;
        const gradeB = b[1].grade ?? 999;
        return gradeA - gradeB || (a[1].level ?? "").localeCompare(b[1].level ?? "");
      })
      .map(([key, group]) => ({
        key,
        level: group.level,
        grade: group.grade,
        rows: [...group.rowMap.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        ),
        columns: [...group.columnMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((group) => group.rows.length > 0);
  }, [exam]);

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Results by grade</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ClipboardList}
            title="No results recorded yet"
            description="No marks have been entered for this exam's subject papers."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Results by grade</CardTitle>
        <p className="text-xs text-muted-foreground">
          Students from every class of the grade share one matrix. Open a student for the full
          performance report.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => {
          const totals = new Map<string, number>();
          for (const row of group.rows) {
            for (const [subject, result] of row.bySubject.entries()) {
              totals.set(subject, (totals.get(subject) ?? 0) + (toNumber(result.marks) ?? 0));
            }
          }

          return (
            <section key={group.key} className="space-y-2">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{gradeLabel(group.grade)}</h3>
                  <Badge variant="secondary">{levelLabel(group.level)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.rows.length} student{group.rows.length === 1 ? "" : "s"} ×{" "}
                  {group.columns.length} subject{group.columns.length === 1 ? "" : "s"}
                </p>
              </header>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pe-3 ps-3 text-start font-medium">Student full name</th>
                      {group.columns.map((column) => (
                        <th
                          key={column.name}
                          className="py-2 pe-3 text-start align-bottom font-medium"
                        >
                          <p className="whitespace-nowrap">{column.name}</p>
                          <p className="mt-0.5 whitespace-nowrap text-[10px] font-normal normal-case tracking-normal">
                            Max {column.maxMarks ?? "—"}
                          </p>
                        </th>
                      ))}
                      <th className="w-10 py-2 pe-3 text-end font-medium">
                        <span className="sr-only">Report</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.studentId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pe-3 ps-3">
                          <Link
                            href={`/school/admin/exams/results/students/${row.studentId}`}
                            className="font-medium hover:underline"
                          >
                            {row.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {row.roleNumber}
                            {row.classNames.size > 0
                              ? ` · ${[...row.classNames].join(", ")}`
                              : ""}
                          </p>
                        </td>
                        {group.columns.map((column) => {
                          const result = row.bySubject.get(column.name);
                          const marks = toNumber(result?.marks);
                          const passMarks = toNumber(result?.examSubject?.passingMarks);
                          const failed = marks != null && passMarks != null && marks < passMarks;
                          return (
                            <td key={column.name} className="py-2 pe-3 tabular-nums">
                              {marks == null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : failed ? (
                                <span className="text-destructive">{marks}</span>
                              ) : (
                                marks
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 pe-3 text-end">
                          <Link
                            href={`/school/admin/exams/results/students/${row.studentId}`}
                            aria-label={`Open ${row.name}'s performance report`}
                            className="inline-flex text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink size={14} aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30">
                      <td className="py-2 pe-3 ps-3 font-medium">Total marks shown</td>
                      {group.columns.map((column) => (
                        <td
                          key={column.name}
                          className="py-2 pe-3 tabular-nums text-muted-foreground"
                        >
                          {totals.get(column.name) ?? 0}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
