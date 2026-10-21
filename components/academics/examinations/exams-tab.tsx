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
import { getExam, listExams } from "@/lib/api/exams";
import type {
  ApiExam,
  ApiExamType,
  ApiPaginated,
  ApiSchoolClass,
} from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

type ExamScope = "MULTI_CLASS" | "CLASS_WIDE" | "UNKNOWN";

/** Raw per-exam facts fetched from GET /exams/:id before scope derivation. */
type ExamHydration = {
  classIds: string[];
};

/** Derived view facts: scope and class labels. */
type ExamView = {
  scope: ExamScope;
  classes: string[];
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

function scheduleLabel(exam: ApiExam): string {
  if (exam.startsOn || exam.endsOn) {
    return `${exam.startsOn ? exam.startsOn.slice(0, 10) : "…"} → ${exam.endsOn ? exam.endsOn.slice(0, 10) : "…"}`;
  }
  const dated = (exam.examSubjects ?? []).find((subject) => subject.examDate)?.examDate;
  return dated ? dated.slice(0, 10) : "—";
}

function targetLabel(view: ExamView | undefined): string {
  if (!view || view.classes.length === 0) return "—";
  return view.classes.join(", ");
}

export function ExamsTab({
  initialData,
  types,
  classes,
}: {
  initialData: ApiPaginated<ApiExam>;
  types: ApiExamType[];
  classes: ApiSchoolClass[];
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [hydrations, setHydrations] = React.useState<Record<string, ExamHydration>>({});
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);

  const classById = React.useMemo(
    () => new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass])),
    [classes],
  );
  const typeNameById = React.useMemo(
    () => new Map(types.map((examType) => [examType.id, examType.name])),
    [types],
  );

  const hydrate = React.useCallback(async (rows: ApiExam[]) => {
    if (rows.length === 0) return;
    const settled = await Promise.allSettled(rows.map((row) => getExam(row.id)));
    setHydrations((current) => {
      const next = { ...current };
      for (const result of settled) {
        if (result.status === "fulfilled") {
          const exam = result.value;
          next[exam.id] = {
            classIds: [...new Set((exam.examSubjects ?? []).map((subject) => subject.classSubject?.classId).filter(Boolean))] as string[],
          };
        }
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    void hydrate(initialData.data);
    // Hydrate once per mount: refreshes flow through retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const views = React.useMemo(() => {
    const map: Record<string, ExamView> = {};
    for (const [examId, value] of Object.entries(hydrations)) {
      const classNames = value.classIds.map((classId) => classById.get(classId)?.className ?? classId);
      const scope: ExamScope = classNames.length > 1 ? "MULTI_CLASS" : classNames.length === 1 ? "CLASS_WIDE" : "UNKNOWN";
      map[examId] = { scope, classes: classNames };
    }
    return map;
  }, [hydrations, classById]);

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const fresh = await listExams({ page: 1, limit: 100 });
      setData(fresh);
      void hydrate(fresh.data);
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
        exam.status.toLowerCase().includes(needle),
    );
  }, [data.data, needle]);

  const columns: Column<ApiExam>[] = [
    {
      id: "name",
      header: "Exam",
      accessor: (exam) => <span className="font-medium">{exam.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      accessor: (exam) => <span className="text-sm">{exam.examType?.name ?? typeNameById.get(exam.examTypeId ?? "") ?? "—"}</span>,
    },
    {
      id: "scope",
      header: "Scope",
      accessor: (exam) => {
        const scope = views[exam.id]?.scope ?? "UNKNOWN";
        return (
          <Badge variant={scope === "MULTI_CLASS" ? "info" : scope === "CLASS_WIDE" ? "secondary" : "outline"}>
            {scope === "MULTI_CLASS" ? "Multi-class" : scope === "CLASS_WIDE" ? "Class-wide" : "—"}
          </Badge>
        );
      },
    },
    {
      id: "target",
      header: "Target grade/class",
      accessor: (exam) => <span className="text-sm">{targetLabel(views[exam.id])}</span>,
    },
    {
      id: "schedule",
      header: "Date & time",
      accessor: (exam) => <span className="text-sm whitespace-nowrap">{scheduleLabel(exam)}</span>,
    },
    {
      id: "enrolled",
      header: "Enrolled",
      accessor: (exam) => {
        const classIds = views[exam.id] ? [...new Set(hydrations[exam.id]?.classIds ?? [])] : [];
        if (classIds.length === 0) return <Badge variant="outline">—</Badge>;
        const total = classIds.reduce((sum, classId) => sum + (classById.get(classId)?.counts?.students ?? 0), 0);
        return <Badge variant="outline">{total}</Badge>;
      },
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
        Every exam scheduled for the year across all classes. Exams are maintained in the academic portal — open a row to view its details.
      </p>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search exams by name, type, or status…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
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
          onRowClick={(exam) => router.push(`/academic/examinations/exams/${exam.id}`)}
          rowActions={[
            { label: "View", icon: <Eye size={14} />, onClick: (exam) => router.push(`/academic/examinations/exams/${exam.id}`) },
          ]}
          emptyTitle="No exams found"
          emptyDescription="No exams match the current search."
        />
      )}
    </div>
  );
}
