"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Printer, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDUCATION_LEVELS } from "@/components/academics/use-level-grade-track";
import { listTenantResults } from "@/lib/api/students";
import { enterSubjectMarks } from "@/lib/api/exams";
import { studentFullName } from "@/lib/api/mappers";
import { academicErrorMessage } from "@/lib/format";
import type { ApiExam, ApiExamType, ApiTenantResult } from "@/lib/api/types";

const GRADE_CHOICE: Record<string, number[]> = {
  SECONDARY: [1, 2, 3],
  INTERMEDIATE: [6, 7, 8, 9],
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function levelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return level === "SECONDARY" ? "Secondary" : level === "INTERMEDIATE" ? "Intermediate" : level;
}

function gradeLabel(grade: number): string {
  switch (grade) {
    case 1:
      return "1st Secondary";
    case 2:
      return "2nd Secondary";
    case 3:
      return "3rd Secondary";
    default:
      return `Grade ${grade}`;
  }
}

function subjectOf(result: ApiTenantResult): string {
  return (
    result.examSubject?.classSubject?.subject?.name ??
    result.examSubject?.classSubject?.schoolClass?.className ??
    "—"
  );
}

function classOf(result: ApiTenantResult): string {
  return result.examSubject?.classSubject?.schoolClass?.id ?? "unassigned";
}

function classLabelOf(result: ApiTenantResult): string {
  return result.examSubject?.classSubject?.schoolClass?.className ?? "Unassigned class";
}

function trackOf(result: ApiTenantResult): string | null {
  return result.examSubject?.classSubject?.schoolClass?.track ?? null;
}

type StudentRow = {
  student: ApiTenantResult["student"];
  bySubject: Map<string, ApiTenantResult>;
};

type ColumnMeta = {
  name: string;
  result: ApiTenantResult;
  submitted: number;
  unmarked: number;
};

type ClassGroup = {
  classId: string;
  className: string;
  level?: string | null;
  grade?: number | null;
  assessment: string;
  assessmentType?: string | null;
  rows: StudentRow[];
  columns: ColumnMeta[];
};

/**
 * Results Wizard. The tenant-wide results board is loaded once and pivoted
 * into one matrix per class: students in rows, subject papers in columns.
 * Marks can be corrected inline; the official result view totals the papers
 * and prints from the browser.
 */
export function ResultsWizard({
  exams,
  examTypes,
  loadError,
}: {
  exams: ApiExam[];
  examTypes: ApiExamType[];
  loadError?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [track, setTrack] = React.useState("");
  const [examId, setExamId] = React.useState("all");

  const [results, setResults] = React.useState<ApiTenantResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(loadError ?? "");

  const [editTarget, setEditTarget] = React.useState<{ group: ClassGroup; row: StudentRow } | null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [editError, setEditError] = React.useState("");

  const [resultTarget, setResultTarget] = React.useState<{ group: ClassGroup; row: StudentRow } | null>(null);

  async function loadResults() {
    setLoading(true);
    setError("");
    try {
      setResults(await listTenantResults());
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load results"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadResults();
    // One batched request on mount; refreshes go through the Refresh button.
  }, []);

  const query = search.trim().toLowerCase();

  const groups = React.useMemo<ClassGroup[]>(() => {
    const map = new Map<
      string,
      {
        className: string;
        level?: string | null;
        grade?: number | null;
        assessment: string;
        assessmentType?: string | null;
        rowMap: Map<string, StudentRow>;
        columnLatest: Map<string, ApiTenantResult>;
      }
    >();
    for (const result of results) {
      if (examId !== "all" && result.examSubject?.exam?.id !== examId) continue;
      const student = result.student;
      if (!student) continue;
      if (query && !studentFullName(student).toLowerCase().includes(query)) continue;
      if (level && student.educationLevel !== level) continue;
      if (grade && Number(student.grade) !== Number(grade)) continue;
      if (track && trackOf(result) !== track) continue;

      const classKey = `${classOf(result)}::${result.examSubject?.exam?.id ?? "none"}`;
      let group = map.get(classKey);
      if (!group) {
        group = {
          className: classLabelOf(result),
          level: result.examSubject?.classSubject?.schoolClass?.educationLevel ?? student.educationLevel,
          grade: result.examSubject?.classSubject?.schoolClass?.grade ?? student.grade,
          assessment: result.examSubject?.exam?.name ?? "Unnamed assessment",
          assessmentType:
            examTypes.find((type) => type.id === result.examSubject?.exam?.examTypeId)?.name ?? null,
          rowMap: new Map(),
          columnLatest: new Map(),
        };
        map.set(classKey, group);
      }
      let row = group.rowMap.get(student.id);
      if (!row) {
        row = { student, bySubject: new Map() };
        group.rowMap.set(student.id, row);
      }
      const subject = subjectOf(result);
      const created = new Date(result.createdAt ?? 0).getTime();
      const existing = row.bySubject.get(subject);
      if (!existing || new Date(existing.createdAt ?? 0).getTime() < created) {
        row.bySubject.set(subject, result);
      }
      const latest = group.columnLatest.get(subject);
      if (!latest || new Date(latest.createdAt ?? 0).getTime() < created) {
        group.columnLatest.set(subject, result);
      }
    }

    return [...map.entries()]
      .sort(
        (a, b) =>
          a[1].className.localeCompare(b[1].className) ||
          a[1].assessment.localeCompare(b[1].assessment),
      )
      .map(([classId, group]) => {
        const rows = [...group.rowMap.values()].sort((a, b) =>
          a.student.roleNumber.localeCompare(b.student.roleNumber, undefined, { numeric: true }),
        );
        const columns: ColumnMeta[] = [...group.columnLatest.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, result]) => ({ name, result, submitted: 0, unmarked: 0 }));
        for (const column of columns) {
          for (const row of rows) {
            const cell = row.bySubject.get(column.name);
            if (!cell) continue;
            if (toNumber(cell.marks) == null) column.unmarked += 1;
            else if (cell.status === "SUBMITTED") column.submitted += 1;
          }
        }
        return {
          classId,
          className: group.className,
          level: group.level,
          grade: group.grade,
          assessment: group.assessment,
          assessmentType: group.assessmentType,
          rows,
          columns,
        };
      });
  }, [results, examId, query, level, grade, track, examTypes]);

  const gradeChoices = level ? GRADE_CHOICE[level] ?? [] : [1, 2, 3, 6, 7, 8, 9];
  const selectedAssessment =
    examId !== "all"
      ? exams.find((exam) => exam.id === examId)?.name ?? "Selected assessment"
      : "All exams & tests";

  function openOfficial(group: ClassGroup, row: StudentRow, print = false) {
    setResultTarget({ group, row });
    if (print) {
      // Let the dialog paint, then isolate it so the browser's PDF/print output
      // contains only the official result instead of the whole results page.
      const cleanup = () => {
        document.body.classList.remove("printing-result");
      };
      document.body.classList.add("printing-result");
      window.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(() => window.print(), 450);
    }
  }

  function openEdit(group: ClassGroup, row: StudentRow) {
    const values: Record<string, string> = {};
    for (const [subject, result] of row.bySubject.entries()) {
      const marks = toNumber(result.marks);
      values[subject] = marks == null ? "" : String(marks);
    }
    setEditValues(values);
    setEditError("");
    setEditTarget({ group, row });
  }

  async function handleSaveMarks(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    const updates: Array<{ examSubjectId: string; marks: number }> = [];
    for (const [subject, value] of Object.entries(editValues)) {
      const result = editTarget.row.bySubject.get(subject);
      if (!result || value === "") continue;
      const marks = Number(value);
      const max = toNumber(result.examSubject?.maxMarks);
      if (!Number.isFinite(marks) || marks < 0) {
        setEditError(`${subject}: marks must be a non-negative number.`);
        return;
      }
      if (max != null && marks > max) {
        setEditError(`${subject}: marks cannot exceed the max of ${max}.`);
        return;
      }
      updates.push({ examSubjectId: result.examSubjectId, marks });
    }
    if (updates.length === 0) {
      setEditTarget(null);
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await Promise.all(
        updates.map((update) =>
          enterSubjectMarks(update.examSubjectId, [
            { studentId: editTarget.row.student.id, marks: update.marks },
          ]),
        ),
      );
      setEditTarget(null);
      await loadResults();
    } catch (cause) {
      setEditError(academicErrorMessage(cause, "Marks could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/school/admin/exams"
          className="-ms-2 mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Examination Center
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Examination Center · Results Wizard
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One matrix per class — students in rows, subject papers in columns. Correct marks, open the
          official result, or jump to a student&apos;s performance history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
          <CardDescription>
            Search by name, then narrow by level, grade, track and the assessment that was sat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-56 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student full name"
              aria-label="Search student full name"
              className="ps-8"
            />
          </div>
          <div className="w-64">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger aria-label="Select exam or test">
                <SelectValue placeholder="All exams & tests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams &amp; tests</SelectItem>
                {exams.map((exam) => {
                  const typeName = exam.examType?.name ?? examTypes.find((type) => type.id === exam.examTypeId)?.name;
                  return (
                    <SelectItem key={exam.id} value={exam.id}>
                      {typeName ? `${exam.name} · ${typeName}` : exam.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select
              value={level}
              onValueChange={(value) => {
                setLevel(value);
                setGrade("");
                setTrack("");
              }}
            >
              <SelectTrigger aria-label="Educational level">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {levelLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select
              value={grade}
              onValueChange={(value) => {
                setGrade(value);
                setTrack("");
              }}
            >
              <SelectTrigger aria-label="Grade">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {gradeChoices.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {gradeLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={track} onValueChange={setTrack}>
              <SelectTrigger aria-label="Track">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ART">Art</SelectItem>
                <SelectItem value="SCIENCE">Science</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void loadResults()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden /> Refreshing…
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Results matrix</CardTitle>
          <CardDescription>
            {groups.length} class {groups.length === 1 ? "group" : "groups"} ·{" "}
            {selectedAssessment}. Column captions show how many marks books are submitted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students match the current search and filters.
            </p>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.classId} className="space-y-2">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {group.className} · {group.assessment}
                      </h3>
                      {group.assessmentType ? (
                        <Badge variant="info">{group.assessmentType}</Badge>
                      ) : null}
                      <Badge variant="secondary">{levelLabel(group.level)}</Badge>
                      {group.grade != null ? (
                        <Badge variant="outline">{gradeLabel(group.grade)}</Badge>
                      ) : null}
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
                          <th className="py-2 pe-3 ps-3 text-start font-medium">Student</th>
                          {group.columns.map((column) => (
                            <th key={column.name} className="py-2 pe-3 align-bottom text-start font-medium">
                              <p className="whitespace-nowrap">{column.name}</p>
                              <p className="mt-0.5 whitespace-nowrap text-[10px] font-normal normal-case tracking-normal">
                                {column.unmarked > 0 ? (
                                  <span className="text-amber-600">{column.unmarked} unmarked</span>
                                ) : (
                                  <span>
                                    {column.submitted}/{group.rows.length} submitted
                                  </span>
                                )}
                              </p>
                            </th>
                          ))}
                          <th className="py-2 pe-3 text-end font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.student.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="py-2 pe-3 ps-3">
                              <p className="whitespace-nowrap font-medium">
                                {studentFullName(row.student)}
                              </p>
                              <p className="text-xs text-muted-foreground">{row.student.roleNumber}</p>
                            </td>
                            {group.columns.map((column) => {
                              const result = row.bySubject.get(column.name);
                              const marks = toNumber(result?.marks);
                              const passMarks = toNumber(result?.examSubject?.passingMarks);
                              const passed =
                                marks == null || passMarks == null || marks >= passMarks;
                              return (
                                <td key={column.name} className="py-2 pe-3 tabular-nums">
                                  {marks == null ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : passed ? (
                                    marks
                                  ) : (
                                    <span className="text-destructive">{marks}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 pe-3 text-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Actions for ${studentFullName(row.student)}`}
                                    >
                                      <MoreHorizontal size={14} aria-hidden />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openEdit(group, row)}>
                                    Edit Marks
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openOfficial(group, row)}>
                                    View Result
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openOfficial(group, row, true)}>
                                    Download Result
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/school/admin/exams/results/students/${row.student.id}`,
                                      )
                                    }
                                  >
                                    Performance history
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30">
                          <td className="py-2 pe-3 ps-3 font-medium">Total shown</td>
                          {group.columns.map((column) => (
                            <td key={column.name} className="py-2 pe-3 text-muted-foreground tabular-nums">
                              {group.rows.reduce(
                                (sum, row) => sum + (toNumber(row.bySubject.get(column.name)?.marks) ?? 0),
                                0,
                              )}
                            </td>
                          ))}
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open && !saving) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {editTarget ? (
            <form onSubmit={(event) => void handleSaveMarks(event)}>
              <DialogHeader>
                <DialogTitle>Edit marks</DialogTitle>
                <DialogDescription>
                  {studentFullName(editTarget.row.student)} · {editTarget.group.className} — updates
                  are saved to this class&apos;s marks books only.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                {editTarget.group.columns.map((column) => {
                  const result = editTarget.row.bySubject.get(column.name);
                  if (!result) return null;
                  const max = toNumber(result.examSubject?.maxMarks);
                  return (
                    <div key={column.name} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                      <div className="min-w-0">
                        <Label htmlFor={`edit-${column.name}`} className="truncate">
                          {column.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {result.examSubject?.exam?.name ? `${result.examSubject.exam.name} · ` : ""}
                          max {max ?? "—"}
                        </p>
                      </div>
                      <Input
                        id={`edit-${column.name}`}
                        inputMode="decimal"
                        value={editValues[column.name] ?? ""}
                        onChange={(event) =>
                          setEditValues((current) => ({
                            ...current,
                            [column.name]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
              {editError ? (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  {editError}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save marks"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resultTarget)}
        onOpenChange={(open) => {
          if (!open) setResultTarget(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl print:max-w-none">
          {resultTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>Official student result</DialogTitle>
                <DialogDescription>{resultTarget.group.assessment}</DialogDescription>
              </DialogHeader>
              <StudentOfficialResult
                row={resultTarget.row}
                className={resultTarget.group.className}
                level={resultTarget.group.level}
                grade={resultTarget.group.grade}
                assessmentLabel={resultTarget.group.assessment}
              />
              <DialogFooter className="justify-between gap-2 print:hidden sm:justify-between">
                <Link
                  href={`/school/admin/exams/results/students/${resultTarget.row.student.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  View performance history →
                </Link>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setResultTarget(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      document.body.classList.add("printing-result");
                      window.addEventListener(
                        "afterprint",
                        () => document.body.classList.remove("printing-result"),
                        { once: true },
                      );
                      window.print();
                    }}
                  >
                    <Printer size={14} aria-hidden /> Download / Print
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentOfficialResult({
  row,
  className,
  level,
  grade,
  assessmentLabel,
}: {
  row: StudentRow;
  className: string;
  level?: string | null;
  grade?: number | null;
  assessmentLabel: string;
}) {
  const entries = [...row.bySubject.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let totalMax = 0;
  let totalPass = 0;
  let totalObtained = 0;
  for (const [, result] of entries) {
    totalMax += toNumber(result.examSubject?.maxMarks) ?? 0;
    totalPass += toNumber(result.examSubject?.passingMarks) ?? 0;
    totalObtained += toNumber(result.marks) ?? 0;
  }
  const overallPassed = totalPass > 0 ? totalObtained >= totalPass : null;

  return (
    <div className="mt-2 space-y-3">
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Student: </span>
          <span className="font-medium">{studentFullName(row.student)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Roll No: </span>
          <span className="font-medium">{row.student.roleNumber}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Class: </span>
          <span className="font-medium">{className}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Assessment: </span>
          <span className="font-medium">{assessmentLabel}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{levelLabel(level)}</Badge>
        {grade != null ? <Badge variant="outline">{gradeLabel(grade)}</Badge> : null}
        <Badge variant="outline">{className}</Badge>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pe-3 text-start font-medium">Subject</th>
            <th className="py-2 pe-3 text-end font-medium">Max</th>
            <th className="py-2 pe-3 text-end font-medium">Pass</th>
            <th className="py-2 pe-3 text-end font-medium">Obtained</th>
            <th className="py-2 text-end font-medium">Grade</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, result]) => {
            const marks = toNumber(result.marks);
            const passValue = toNumber(result.examSubject?.passingMarks);
            const passed = marks != null && passValue != null && marks >= passValue;
            return (
              <tr key={name} className="border-b last:border-0">
                <td className="py-2 pe-3 font-medium">{name}</td>
                <td className="py-2 pe-3 text-end text-muted-foreground">
                  {toNumber(result.examSubject?.maxMarks) ?? "—"}
                </td>
                <td className="py-2 pe-3 text-end text-muted-foreground">{passValue ?? "—"}</td>
                <td
                  className={`py-2 pe-3 text-end font-medium tabular-nums ${
                    passed === false ? "text-destructive" : ""
                  }`}
                >
                  {marks ?? "—"}
                </td>
                <td className="py-2 text-end text-muted-foreground">{result.grade ?? "—"}</td>
              </tr>
            );
          })}
          <tr className="border-t-2">
            <td className="py-2 pe-3 font-semibold">Total</td>
            <td className="py-2 pe-3 text-end font-semibold tabular-nums">{totalMax}</td>
            <td className="py-2 pe-3 text-end font-semibold tabular-nums">{totalPass}</td>
            <td className="py-2 pe-3 text-end font-semibold tabular-nums">{totalObtained}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall result:</span>
        {overallPassed === null ? (
          <Badge variant="outline">Not determined</Badge>
        ) : overallPassed ? (
          <Badge variant="success">Pass</Badge>
        ) : (
          <Badge variant="destructive">Fail</Badge>
        )}
        {totalMax > 0 ? (
          <span className="text-sm text-muted-foreground">
            {Math.round((totalObtained / totalMax) * 1000) / 10}% overall
          </span>
        ) : null}
      </div>
    </div>
  );
}
