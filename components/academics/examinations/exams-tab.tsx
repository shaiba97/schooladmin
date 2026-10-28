"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Eye, Search } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listExams } from "@/lib/api/exams";
import type { ApiExam, ApiExamType, ApiPaginated } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const GRADES: Record<number, string> = {
  1: "1st Secondary",
  2: "2nd Secondary",
  3: "3rd Secondary",
  6: "6th Intermediate",
  7: "7th Intermediate",
  8: "8th Intermediate",
  9: "9th Intermediate",
};

/** Exam-status palette: info while scheduled, success once published. */
export function examStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "DRAFT":
      return "muted";
    case "SCHEDULED":
      return "info";
    case "ONGOING":
      return "warning";
    case "MARKS_OPEN":
    case "MODERATION":
      return "purple";
    case "CLOSED":
      return "outline";
    default:
      return "secondary";
  }
}

function levelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return level === "SECONDARY" ? "Secondary" : level === "INTERMEDIATE" ? "Intermediate" : level;
}

function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "—";
  return GRADES[grade] ?? `Grade ${grade}`;
}

function yearMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7).replace("-", "/");
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function examScope(exam: ApiExam) {
  const seen = new Map<
    string,
    { className: string; level?: string | null; grade?: number | null }
  >();
  for (const subject of exam.examSubjects ?? []) {
    const schoolClass = subject.classSubject?.schoolClass;
    if (!schoolClass) continue;
    seen.set(schoolClass.id, {
      className: schoolClass.className,
      level: schoolClass.educationLevel,
      grade: schoolClass.grade,
    });
  }
  const classes = [...seen.values()].sort((a, b) => a.className.localeCompare(b.className));
  const levels = [...new Set(classes.map((entry) => entry.level).filter(Boolean))] as string[];
  const grades = [...new Set(classes.map((entry) => entry.grade).filter((grade) => grade != null))] as number[];
  return { classes, levels, grades };
}

function dateLabel(exam: ApiExam): string {
  const start = yearMonth(exam.startsOn);
  const end = yearMonth(exam.endsOn);
  if (start && end && start !== end) return `${start} → ${end}`;
  if (start) return start;
  const paperDates = (exam.examSubjects ?? [])
    .map((subject) => subject.examDate)
    .filter(Boolean)
    .sort() as string[];
  return yearMonth(paperDates[0]) ?? "—";
}

export function ExamsTab({
  initialData,
  types,
}: {
  initialData: ApiPaginated<ApiExam>;
  types: ApiExamType[];
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);

  const typeNameById = React.useMemo(
    () => new Map(types.map((examType) => [examType.id, examType.name])),
    [types],
  );

  async function retry() {
    setLoading(true);
    setError("");
    try {
      setData(await listExams({ page: 1, limit: 200 }));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load exams"));
    } finally {
      setLoading(false);
    }
  }

  const needle = deferredSearch.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!needle) return data.data;
    return data.data.filter(
      (exam) =>
        exam.name.toLowerCase().includes(needle) ||
        (exam.examType?.name ?? "").toLowerCase().includes(needle) ||
        exam.status.toLowerCase().includes(needle) ||
        examScope(exam).classes.some((entry) => entry.className.toLowerCase().includes(needle)),
    );
  }, [data.data, needle]);

  const columns: Column<ApiExam>[] = [
    {
      id: "name",
      header: "Exam",
      accessor: (exam) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{exam.name}</p>
          <p className="text-xs text-muted-foreground">
            {exam.examType?.name ?? typeNameById.get(exam.examTypeId ?? "") ?? "Unclassified"}
          </p>
        </div>
      ),
    },
    {
      id: "grade",
      header: "Level / Grade",
      accessor: (exam) => {
        const { levels, grades } = examScope(exam);
        return (
          <div className="flex flex-wrap gap-1">
            {levels.length === 1 ? <Badge variant="secondary">{levelLabel(levels[0])}</Badge> : null}
            {grades.length > 0 ? (
              grades.map((grade) => (
                <Badge key={grade} variant="outline">
                  {gradeLabel(grade)}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: "classes",
      header: "Classes",
      accessor: (exam) => {
        const { classes } = examScope(exam);
        if (classes.length === 0) return <span className="text-muted-foreground">—</span>;
        if (classes.length > 2) {
          return (
            <span className="text-sm" title={classes.map((entry) => entry.className).join(", ")}>
              {classes[0].className} +{classes.length - 1} more
            </span>
          );
        }
        return <span className="text-sm">{classes.map((entry) => entry.className).join(", ")}</span>;
      },
    },
    {
      id: "date",
      header: "Date (year/month)",
      accessor: (exam) => <span className="whitespace-nowrap text-sm tabular-nums">{dateLabel(exam)}</span>,
    },
    {
      id: "counts",
      header: "Papers / rooms",
      accessor: (exam) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {exam._count?.examSubjects ?? exam.examSubjects?.length ?? 0} papers ·{" "}
          {exam._count?.examRoomAssignments ?? exam.examRoomAssignments?.length ?? 0} rooms
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (exam) => <Badge variant={examStatusVariant(exam.status)}>{exam.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every exam and test scheduled for the year, with its grade, classes and rooms. Open a row for
        the full record.
      </p>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute start-2.5 top-2.5 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search exams by name, class, type, or status…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="ps-8"
          aria-label="Search exams"
        />
      </div>

      {loading && data.data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No exams yet"
          description="No exams have been scheduled for this year yet."
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(exam) => exam.id}
          onRowClick={(exam) => router.push(`/school/admin/exams/${exam.id}`)}
          rowActions={[
            {
              label: "View",
              icon: <Eye size={14} />,
              onClick: (exam) => router.push(`/school/admin/exams/${exam.id}`),
            },
          ]}
          emptyTitle="No exams found"
          emptyDescription="No exams match the current search."
        />
      )}
    </div>
  );
}
