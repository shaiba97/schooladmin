"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Minus,
  Phone,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStudent,
  listStudentAttendanceRecords,
  listStudentResults,
} from "@/lib/api/students";
import { currentClassLabel, studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage, formatAcademicDate } from "@/lib/format";
import type { ApiStudent, ApiStudentAttendanceRecord, ApiStudentResult } from "@/lib/api/types";

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function levelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return level === "SECONDARY" ? "Secondary" : level === "INTERMEDIATE" ? "Intermediate" : level;
}

function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "—";
  return GRADE_LABELS[grade] ?? `Grade ${grade}`;
}

type ScorePoint = {
  label: string;
  subject: string;
  assessment: string;
  percent: number;
  createdOn: string;
};

type Trend =
  | { label: "Improving" | "Stable" | "Going down"; variant: "success" | "warning" | "destructive"; delta: number }
  | null;

function computeTrend(points: ScorePoint[]): Trend {
  if (points.length < 2) return null;
  const recentCount = Math.min(3, Math.max(1, Math.ceil(points.length / 2)));
  const recent = points.slice(-recentCount);
  const earlier = points.slice(0, -recentCount);
  if (earlier.length === 0) return null;
  const mean = (rows: ScorePoint[]) =>
    rows.reduce((sum, row) => sum + row.percent, 0) / rows.length;
  const delta = Math.round((mean(recent) - mean(earlier)) * 10) / 10;
  if (delta >= 5) return { label: "Improving", variant: "success", delta };
  if (delta <= -5) return { label: "Going down", variant: "destructive", delta };
  return { label: "Stable", variant: "warning", delta };
}

/**
 * Student performance report reached from the Results Wizard. Surfaces the
 * personal details, a trend verdict, two charts and the full historical
 * results table so regressions are visible at a glance.
 */
export function StudentResultsClient({ studentId }: { studentId: string }) {
  const [student, setStudent] = React.useState<ApiStudent | null>(null);
  const [results, setResults] = React.useState<ApiStudentResult[]>([]);
  const [attendance, setAttendance] = React.useState<ApiStudentAttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.allSettled([
      getStudent(studentId),
      listStudentResults(studentId),
      listStudentAttendanceRecords(studentId),
    ])
      .then(([studentResult, resultsResult, attendanceResult]) => {
        if (cancelled) return;
        if (studentResult.status === "rejected") {
          setError(academicErrorMessage(studentResult.reason, "Student record could not be loaded."));
        } else {
          setStudent(studentResult.value);
        }
        setResults(resultsResult.status === "fulfilled" ? resultsResult.value : []);
        setAttendance(attendanceResult.status === "fulfilled" ? attendanceResult.value : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const scorePoints = React.useMemo<ScorePoint[]>(() => {
    const points: ScorePoint[] = [];
    for (const result of results) {
      const marks = toNumber(result.marks);
      const max = toNumber(result.examSubject?.maxMarks);
      if (marks == null || max == null || max <= 0) continue;
      points.push({
        label:
          (result.examSubject?.classSubject?.subject?.name ?? "—") +
          (result.examSubject?.exam?.name ? ` · ${result.examSubject.exam.name}` : ""),
        subject: result.examSubject?.classSubject?.subject?.name ?? "—",
        assessment: result.examSubject?.exam?.name ?? "—",
        percent: Math.round((marks / max) * 1000) / 10,
        createdOn: result.createdAt ?? "",
      });
    }
    points.sort(
      (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
    );
    return points;
  }, [results]);

  const trend = React.useMemo(() => computeTrend(scorePoints), [scorePoints]);

  const subjectAverages = React.useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const point of scorePoints) {
      const list = groups.get(point.subject) ?? [];
      list.push(point.percent);
      groups.set(point.subject, list);
    }
    return [...groups.entries()]
      .map(([subject, values]) => ({
        subject,
        average:
          Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
      }))
      .sort((a, b) => b.average - a.average);
  }, [scorePoints]);

  const metrics = React.useMemo(() => {
    const numbers = scorePoints.map((point) => point.percent);
    const average = numbers.length
      ? Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10
      : null;
    const highest = numbers.length ? Math.max(...numbers) : null;
    const lowest = numbers.length ? Math.min(...numbers) : null;
    const attendanceRate = (() => {
      if (attendance.length === 0) return null;
      const present = attendance.filter((row) => row.status?.toUpperCase() === "PRESENT").length;
      return Math.round((present / attendance.length) * 1000) / 10;
    })();
    return { average, highest, lowest, attendanceRate, entries: numbers.length };
  }, [scorePoints, attendance]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <p className="font-medium">Student not found</p>
        <p className="mt-1 text-destructive/80">
          {error || "The student record could not be loaded."}
        </p>
        <Link
          href="/school/admin/exams/results"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <ArrowLeft size={14} aria-hidden /> Back to results
        </Link>
      </div>
    );
  }

  const guardian = student.guardians?.find((entry) => entry.isPrimary) ?? student.guardians?.[0];

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/school/admin/exams/results"
          className="-ms-2 mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden /> Results
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Performance Report
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{studentFullName(student)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal details, marks trend and the complete result history for this student.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm">
          <Badge variant="secondary">{levelLabel(student.educationLevel)}</Badge>
          <Badge variant="outline">{gradeLabel(student.grade)}</Badge>
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-muted-foreground" aria-hidden />
            <span className="font-medium">{currentClassLabel(student)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Roll No: </span>
            <span className="font-medium">{student.roleNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium">{student.status.replaceAll("_", " ").toLowerCase()}</span>
          </div>
          {guardian ? (
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Guardian: </span>
              <span className="font-medium">
                {[guardian.guardian.firstName, guardian.guardian.lastName].filter(Boolean).join(" ")}
              </span>
              {guardian.guardian.phone ? (
                <span className="text-muted-foreground">· {guardian.guardian.phone}</span>
              ) : null}
            </div>
          ) : null}
          {student.admissionDate ? (
            <div className="text-muted-foreground">
              Admitted {formatAcademicDate(student.admissionDate)}
            </div>
          ) : null}
          {trend ? (
            <div className="ms-auto flex items-center gap-1.5">
              {trend.label === "Improving" ? (
                <TrendingUp size={14} aria-hidden />
              ) : trend.label === "Going down" ? (
                <TrendingDown size={14} aria-hidden />
              ) : (
                <Minus size={14} aria-hidden />
              )}
              <Badge variant={trend.variant}>
                {trend.label} · {trend.delta > 0 ? `+${trend.delta}` : trend.delta} pts
              </Badge>
            </div>
          ) : (
            <Badge variant="outline" className="ms-auto">
              Not enough history for a trend
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Average score" value={metrics.average != null ? `${metrics.average}%` : "—"} />
        <MetricCard label="Highest score" value={metrics.highest != null ? `${metrics.highest}%` : "—"} />
        <MetricCard label="Lowest score" value={metrics.lowest != null ? `${metrics.lowest}%` : "—"} />
        <MetricCard
          label="Attendance rate"
          value={metrics.attendanceRate != null ? `${metrics.attendanceRate}%` : "—"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Score progression</CardTitle>
            <CardDescription>Chronological percentage score across assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            {scorePoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No marked results yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scorePoints} margin={{ top: 8, right: 12, bottom: 8, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      height={48}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Score"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.assessment ?? ""}
                    />
                    <Line
                      type="monotone"
                      dataKey="percent"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subject averages</CardTitle>
            <CardDescription>Mean percentage per subject across all assessments.</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectAverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No marked results yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAverages} margin={{ top: 8, right: 12, bottom: 8, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      height={48}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(value) => [`${value}%`, "Average"]} />
                    <Bar dataKey="average" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historical results</CardTitle>
          <CardDescription>Every recorded result, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pe-3 ps-3 text-start font-medium">Academic year</th>
                    <th className="py-2 pe-3 text-start font-medium">Level</th>
                    <th className="py-2 pe-3 text-start font-medium">Grade</th>
                    <th className="py-2 pe-3 text-start font-medium">Class</th>
                    <th className="py-2 pe-3 text-start font-medium">Assessment</th>
                    <th className="py-2 pe-3 text-start font-medium">Subject</th>
                    <th className="py-2 pe-3 text-end font-medium">Score / Max</th>
                    <th className="py-2 pe-3 text-end font-medium">Percent</th>
                    <th className="py-2 pe-3 text-end font-medium">Grade</th>
                    <th className="py-2 pe-3 text-start font-medium">Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const exam = result.examSubject?.exam;
                    const schoolClass = result.examSubject?.classSubject?.schoolClass;
                    const marks = toNumber(result.marks);
                    const max = toNumber(result.examSubject?.maxMarks);
                    const percent =
                      marks != null && max != null && max > 0
                        ? Math.round((marks / max) * 1000) / 10
                        : null;
                    return (
                      <tr key={result.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 pe-3 ps-3 text-muted-foreground">
                          {exam?.academicYear?.name ?? "—"}
                        </td>
                        <td className="py-2 pe-3 text-muted-foreground">
                          {levelLabel(schoolClass?.educationLevel ?? student.educationLevel)}
                        </td>
                        <td className="py-2 pe-3 text-muted-foreground">
                          {gradeLabel(schoolClass?.grade ?? student.grade)}
                        </td>
                        <td className="py-2 pe-3">
                          {schoolClass?.className ?? "—"}
                        </td>
                        <td className="py-2 pe-3">{exam?.name ?? "—"}</td>
                        <td className="py-2 pe-3">
                          {result.examSubject?.classSubject?.subject?.name ?? "—"}
                        </td>
                        <td className="py-2 pe-3 text-end whitespace-nowrap tabular-nums">
                          {marks != null ? (
                            <>
                              {marks} <span className="text-muted-foreground">/ {max ?? "—"}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pe-3 text-end tabular-nums">
                          {percent != null ? `${percent}%` : "—"}
                        </td>
                        <td className="py-2 pe-3 text-end">{result.grade ?? "—"}</td>
                        <td className="py-2 pe-3 text-muted-foreground">
                          {result.createdAt ? formatAcademicDate(result.createdAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}
