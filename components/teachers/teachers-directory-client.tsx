"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherAvatar } from "@/components/teachers/teacher-avatar";
import {
  deptName,
  fullName,
  listTeachers,
  profileImageDocument,
} from "@/lib/api/teachers";
import type { ApiDepartment, ApiPaginated, ApiTeacher } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

function formatDOB(dob?: string | null) {
  if (!dob) return "—";
  try {
    return new Date(dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dob;
  }
}

/**
 * Read-only mirror of the Academic Affairs teachers directory: same table,
 * same filters — every write control (Add/Edit/Deactivate/Delete) removed,
 * and the only row action is View (profile navigation).
 */
export function TeachersDirectoryClient({
  initialData,
  departments = [],
  initialError = "",
  departmentsError = "",
}: {
  initialData: ApiPaginated<ApiTeacher>;
  departments?: ApiDepartment[];
  initialError?: string;
  departmentsError?: string;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState(initialError);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("ALL");

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const refreshed = await listTeachers({ page: 1, limit: 100 });
      setData(refreshed);
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to load teachers"));
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.data.filter((teacher) => {
      if (deptFilter !== "ALL" && teacher.departmentId !== deptFilter) return false;
      if (!q) return true;
      const haystack = [fullName(teacher), teacher.user?.phone ?? "", teacher.employeeNumber ?? "", deptName(teacher, departments)].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [data.data, departments, deptFilter, search]);

  const columns: Column<ApiTeacher>[] = [
    {
      id: "teacher",
      header: "Teacher",
      accessor: (teacher) => {
        const photo = profileImageDocument(teacher);
        return (
          <span className="flex items-center gap-3">
            <TeacherAvatar teacher={teacher} photoObjectKey={photo?.objectKey} size="sm" />
            <span className="font-medium truncate min-w-0">{fullName(teacher)}</span>
          </span>
        );
      },
      sortable: true,
    },
    {
      id: "employeeNumber",
      header: "Employee No",
      accessor: (teacher) => <span className="font-mono text-xs">{teacher.employeeNumber || "—"}</span>,
      sortable: true,
    },
    {
      id: "department",
      header: "Department",
      accessor: (teacher) => <Badge variant="outline">{deptName(teacher, departments)}</Badge>,
      sortable: true,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (teacher) => <span className="font-mono text-xs">{teacher.user?.phone || "—"}</span>,
      sortable: true,
    },
    {
      id: "dateOfBirth",
      header: "Date of Birth",
      accessor: (teacher) => <span className="text-sm">{formatDOB(teacher.dateOfBirth)}</span>,
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (teacher) => <Badge variant={teacher.status === "ACTIVE" ? "success" : "muted"}>{teacher.status}</Badge>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Teachers</h1>
        <p className="text-sm text-muted-foreground mt-1">Teacher profiles, files and account status.</p>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={loading}>Retry</Button>
        </div>
      ) : null}
      {departmentsError ? (
        <p role="note" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">Departments could not be loaded — department names may show as Unassigned. {departmentsError}</p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
          <Input placeholder="Search loaded teachers…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" aria-label="Search teachers" />
        </div>
        <select
          value={deptFilter}
          onChange={(event) => setDeptFilter(event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Filter by department"
        >
          <option value="ALL">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
      </div>

      {loading && data.data.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 && data.data.length === 0 ? (
        <EmptyState title="No teachers yet" description="Teacher records are managed in the Academic portal and appear here once created." />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(teacher) => teacher.id}
          onRowClick={(teacher) => router.push(`/academic/teachers/${teacher.id}`)}
          rowActions={[
            { label: "View", icon: <Eye size={14} />, onClick: (teacher) => router.push(`/academic/teachers/${teacher.id}`) },
          ]}
          emptyTitle="No teachers found"
          emptyDescription="No teacher records match the current filters."
        />
      )}
      {loading && data.data.length > 0 ? <p role="status" className="text-xs text-muted-foreground">Refreshing teachers…</p> : null}
    </div>
  );
}
