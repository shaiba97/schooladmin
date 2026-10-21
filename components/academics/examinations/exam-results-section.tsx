"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApiExam, ApiExamSubject, ApiStudentResult } from "@/lib/api/types";
import { subjectLabel } from "./exam-detail-client";

type ResultRow = {
  key: string;
  student: string;
  subjectName: string | null;
  subject: ApiExamSubject;
  marks: ApiStudentResult["marks"];
};

function studentName(result: ApiStudentResult): string {
  const name = result.student;
  return [name?.firstName, name?.lastName].filter(Boolean).join(" ").trim() || "—";
}

export function ExamResultsSection({ exam }: { exam: ApiExam }) {
  const subjects = React.useMemo(() => exam.examSubjects ?? [], [exam]);
  const showSubject = subjects.length > 1;

  const rows: ResultRow[] = React.useMemo(
    () =>
      subjects.flatMap((subject) =>
        (subject.results ?? []).map((result, index) => ({
          key: `${subject.id}:${result.studentId ?? result.id ?? index}`,
          student: studentName(result),
          subjectName: showSubject ? subjectLabel(subject) : null,
          subject,
          marks: result.marks,
        })),
      ),
    [subjects, showSubject],
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ClipboardList}
            title="No results recorded yet"
            description="No marks have been entered for this exam's subjects."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Student full name</th>
                {showSubject ? (
                  <th scope="col" className="px-3 py-2 font-medium">Subject name</th>
                ) : null}
                <th scope="col" className="px-3 py-2 font-medium">Score</th>
                <th scope="col" className="px-3 py-2 font-medium">Max marks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2">{row.student}</td>
                  {showSubject ? (
                    <td className="px-3 py-2 text-muted-foreground">{row.subjectName}</td>
                  ) : null}
                  <td className="px-3 py-2">
                    {row.marks === null || row.marks === undefined || row.marks === "" ? "—" : String(row.marks)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{String(row.subject.maxMarks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
