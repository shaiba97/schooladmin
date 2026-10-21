"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentAvatar } from "@/components/students/student-avatar";
import { listStudents, getStudentReferenceData } from "@/lib/api/students";
import type { ApiPaginated, ApiReferenceData, ApiStudent } from "@/lib/api/types";
import { currentEnrollment, studentFullName } from "@/lib/api/mappers";
import { toTitleCase } from "@/lib/text";
import { ageFromDob, academicErrorMessage, formatAcademicDate } from "@/lib/format";
import { STUDENT_STATUSES, studentStatusBadgeVariant } from "@/lib/student-status";

/**
 * Mirrors the Academic Affairs "Students" directory (components/students/
 * students-all-client.tsx there): same search/filter/column machinery,
 * minus every write surface — no admissions trigger, no row action menus,
 * no bulk actions, no dialogs. The only row control is View Profile.
 */
export function StudentsDirectoryClient({
  initialData,
  initialError,
}: {
  initialData: ApiPaginated<ApiStudent>;
  initialError?: string;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(initialError ?? "");
  const [levelFilter, setLevelFilter] = React.useState("ALL");
  const [gradeFilter, setGradeFilter] = React.useState("ALL");
  const [classFilter, setClassFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [reference, setReference] = React.useState<ApiReferenceData | null>(null);

  React.useEffect(() => {
    let active = true;
    getStudentReferenceData()
      .then((result) => {
        if (active) setReference(result);
      })
      .catch(() => {
        // Filters degrade gracefully: dropdowns stay populated from row data.
      });
    return () => {
      active = false;
    };
  }, []);

  type Filters = { level: string; grade: string; classId: string; status: string };

  async function load(nextPage = page, filters: Filters = { level: levelFilter, grade: gradeFilter, classId: classFilter, status: statusFilter }) {
    setLoading(true);
    setError("");
    try {
      const result = await listStudents({
        page: nextPage,
        limit: 50,
        search: search || undefined,
        status: filters.status !== "ALL" ? filters.status : undefined,
        educationLevel: filters.level !== "ALL" ? filters.level : undefined,
        grade: filters.grade !== "ALL" ? Number(filters.grade) : undefined,
        classId: filters.classId !== "ALL" ? filters.classId : undefined,
      });
      setData(result);
      setPage(nextPage);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load students"));
    } finally {
      setLoading(false);
    }
  }

  function classCell(student: ApiStudent) {
    const schoolClass = currentEnrollment(student)?.schoolClass;
    if (!schoolClass) return "—";
    const showTrack =
      schoolClass.educationLevel === "SECONDARY" &&
      (schoolClass.grade === "SECOND" || schoolClass.grade === "THIRD") &&
      !!schoolClass.track;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-sm">{schoolClass.className}</span>
        {showTrack ? (
          <Badge variant="outline">{schoolClass.track === "SCIENCE" ? "Science" : "Art"}</Badge>
        ) : null}
      </span>
    );
  }

  function guardianCell(student: ApiStudent) {
    // The list endpoint carries no guardian joins (only counts), so the
    // directory shows the stored parent names and the student phone; the
    // full primary-guardian contact lives on the profile tab.
    const parents = [student.fatherFullname, student.motherFullname]
      .filter(Boolean)
      .map((name) => toTitleCase(name as string));
    const phone = student.phone ? <span className="font-mono text-xs">{student.phone}</span> : null;
    if (parents.length === 0 && !phone) return "—";
    return (
      <span className="text-sm">
        {parents.length > 0 ? <span className="truncate">{parents.join(" / ")}</span> : <span className="text-muted-foreground">—</span>}
        {phone ? <span className="block text-muted-foreground">{phone}</span> : null}
      </span>
    );
  }

  function demographicsCell(student: ApiStudent) {
    const age = ageFromDob(student.dateOfBirth);
    return (
      <span className="text-sm">
        {student.gender ?? "—"}
        <span className="block text-muted-foreground">
          {age != null ? `Age ${age}` : student.dateOfBirth ? formatAcademicDate(student.dateOfBirth) : "—"}
        </span>
      </span>
    );
  }

  const columns: Column<ApiStudent>[] = [
    { id: "roleNumber", header: "Roll No", accessor: (student) => <span className="font-mono text-xs tracking-wider">{student.roleNumber}</span>, sortable: true },
    {
      id: "name",
      header: "Name",
      accessor: (student) => (
        <span className="flex items-center gap-2.5 min-w-0">
          <StudentAvatar student={student} size="sm" />
          <span className="min-w-0">
            <span className="font-medium truncate min-w-0 block">{toTitleCase(studentFullName(student))}</span>
            <Badge variant="outline" className="mt-0.5">{student.roleNumber}</Badge>
          </span>
        </span>
      ),
      sortable: true,
    },
    {
      id: "level",
      header: "Education Level",
      accessor: (student) => <span className="text-sm">{student.educationLevel ?? "—"}</span>,
      sortable: true,
    },
    { id: "className", header: "Class", accessor: (student) => classCell(student) },
    { id: "guardian", header: "Guardian / Parent", accessor: (student) => guardianCell(student) },
    { id: "demographics", header: "Gender & Age", accessor: (student) => demographicsCell(student) },
    {
      id: "status",
      header: "Status",
      accessor: (student) => <Badge variant={studentStatusBadgeVariant(student.status)}>{student.status}</Badge>,
      sortable: true,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (student) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/academic/students/${student.id}`);
          }}
        >
          <Eye size={14} /> View Profile
        </Button>
      ),
    },
  ];

  const grades = React.useMemo(() => {
    const fromReference = (reference?.classes ?? []).map((c) => c.grade).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const unique = Array.from(new Set(fromReference));
    return unique.length > 0 ? unique : [];
  }, [reference]);

  const classOptions = reference?.classes ?? [];

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Students Directory</h1>
          <p className="text-sm text-muted-foreground">View-only master list of enrolled students across all grade levels.</p>
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
          <Input placeholder="Search name or roll number" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" aria-label="Search students" />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
        {search ? <Button type="button" variant="ghost" onClick={() => { setSearch(""); void load(1); }}>Clear</Button> : null}
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          value={levelFilter}
          onChange={(event) => { const v = event.target.value; setLevelFilter(v); void load(1, { level: v, grade: gradeFilter, classId: classFilter, status: statusFilter }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by education level"
        >
          <option value="ALL">All Levels</option>
          <option value="SECONDARY">Secondary</option>
          <option value="INTERMEDIATE">Intermediate</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(event) => { const v = event.target.value; setGradeFilter(v); void load(1, { level: levelFilter, grade: v, classId: classFilter, status: statusFilter }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by grade"
        >
          <option value="ALL">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(event) => { const v = event.target.value; setClassFilter(v); void load(1, { level: levelFilter, grade: gradeFilter, classId: v, status: statusFilter }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm max-w-xs"
          aria-label="Filter by class"
        >
          <option value="ALL">All Classes</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.className}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => { const v = event.target.value; setStatusFilter(v); void load(1, { level: levelFilter, grade: gradeFilter, classId: classFilter, status: v }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      {data.data.length === 0 && !loading ? (
        <EmptyState title="No students found" description={search ? "Try a different search." : "No student records match the current filters."} />
      ) : (
        <DataTable
          data={data.data}
          columns={columns}
          getRowId={(student) => student.id}
          onRowClick={(student) => router.push(`/academic/students/${student.id}`)}
          pageSize={50}
          emptyTitle="No students"
          emptyDescription="No student records match the current filters."
        />
      )}

      {data.total > data.limit ? <div className="flex flex-wrap items-center justify-end gap-2 text-sm"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</Button><span>Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>Next</Button></div> : null}
    </div>
  );
}
