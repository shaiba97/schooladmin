"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  DoorOpen,
  LayoutGrid,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { ApiExam, ApiExamType, ApiHall } from "@/lib/api/types";

const GRADE_LABELS: Record<number, string> = {
  1: "1st Secondary",
  2: "2nd Secondary",
  3: "3rd Secondary",
  6: "6th Intermediate",
  7: "7th Intermediate",
  8: "8th Intermediate",
  9: "9th Intermediate",
};

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

const TABS = [
  { id: "exams" as const, label: "Exams / Tests", icon: ClipboardCheck },
  { id: "rooms" as const, label: "Rooms", icon: DoorOpen },
];

type TabId = (typeof TABS)[number]["id"];

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function examPeriod(exam: ApiExam): string {
  const start = safeDate(exam.startsOn);
  const end = safeDate(exam.endsOn);
  if (!start && !end) return "Not scheduled";
  if (start && !end) return MONTH_YEAR.format(start);
  if (!start && end) return MONTH_YEAR.format(end);
  if (!start || !end) return "Not scheduled";
  const startLabel = MONTH_YEAR.format(start);
  const endLabel = MONTH_YEAR.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function examScope(exam: ApiExam): { level: string | null; grade: number | null } {
  for (const subject of exam.examSubjects ?? []) {
    const schoolClass = subject.classSubject?.schoolClass;
    if (!schoolClass) continue;
    return { level: schoolClass.educationLevel ?? null, grade: schoolClass.grade ?? null };
  }
  return { level: null, grade: null };
}

function levelLabel(level: string | null | undefined): string {
  if (level === "SECONDARY") return "Secondary";
  if (level === "INTERMEDIATE") return "Intermediate";
  return "All levels";
}

function roomNumberOf(hallName: string): number | null {
  const match = hallName.match(/ Room (\d+)$/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isInteger(value) ? value : null;
}

function classOfRoom(hallName: string): string {
  return hallName.replace(/ Room \d+$/, "") || hallName;
}

/**
 * Examination Center home. Two tabs: every exam/test on one table, and the
 * room inventory. Exams open their own details page, which now carries the
 * grade-wide results matrix.
 */
export function ExaminationCenterClient({
  exams,
  examTypes,
  halls,
  loadError,
}: {
  exams: ApiExam[];
  examTypes: ApiExamType[];
  halls: ApiHall[];
  loadError: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>("exams");
  const [query, setQuery] = React.useState("");

  const typeNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const type of examTypes) map.set(type.id, type.name);
    return map;
  }, [examTypes]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return exams;
    return exams.filter((exam) => {
      const scope = examScope(exam);
      return [
        exam.name,
        exam.examType?.name ?? (exam.examTypeId ? typeNames.get(exam.examTypeId) : ""),
        exam.status,
        scope.level ?? "",
        scope.grade != null ? String(scope.grade) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [exams, query, typeNames]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin · Academic Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ClipboardCheck size={20} className="text-primary" aria-hidden /> Examination Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every exam and test, the rooms that seat them, and the marks behind each transcript.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            <RefreshCw size={14} aria-hidden /> Refresh
          </Button>
          {tab === "rooms" ? (
            <Link href="/school/admin/exams/rooms" className={buttonVariants()}>
              <DoorOpen size={14} aria-hidden /> Manage rooms
            </Link>
          ) : (
            <Link href="/school/admin/exams/create" className={buttonVariants()}>
              <Sparkles size={14} aria-hidden /> New exam
            </Link>
          )}
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="Examination Center"
      >
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`exam-panel-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                active ? "border bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} aria-hidden /> {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "exams" ? (
        <div id="exam-panel-exams" role="tabpanel" aria-label="Exams / Tests">
          <Card>
            <CardHeader className="gap-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Exams &amp; tests</CardTitle>
                  <CardDescription>
                    {filtered.length} record{filtered.length === 1 ? "" : "s"} — open a row to view
                    details, candidates, invigilators and grade results.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search
                    size={14}
                    className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search exams or tests…"
                    aria-label="Search exams or tests"
                    className="ps-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title={exams.length === 0 ? "No exams or tests yet" : "No matching records"}
                  description={
                    exams.length === 0
                      ? "Schedule the first exam to build its rooms and results."
                      : "Try a different name, grade or level."
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pe-3 ps-4 text-start font-medium">Exam / Test</th>
                        <th className="py-2.5 pe-3 text-start font-medium">Date (Month / Year)</th>
                        <th className="w-12 py-2.5 pe-4 text-end font-medium">
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((exam) => {
                        const scope = examScope(exam);
                        const typeName =
                          exam.examType?.name ??
                          (exam.examTypeId ? typeNames.get(exam.examTypeId) : undefined);
                        return (
                          <tr
                            key={exam.id}
                            role="link"
                            tabIndex={0}
                            onClick={() => router.push(`/school/admin/exams/${exam.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(`/school/admin/exams/${exam.id}`);
                              }
                            }}
                            className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                          >
                            <td className="py-3 pe-3 ps-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{exam.name}</span>
                                {typeName ? <Badge variant="info">{typeName}</Badge> : null}
                                {scope.grade != null ? (
                                  <Badge variant="outline">
                                    {GRADE_LABELS[scope.grade] ?? `Grade ${scope.grade}`}
                                  </Badge>
                                ) : null}
                                {scope.level ? (
                                  <Badge variant="secondary">{levelLabel(scope.level)}</Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 pe-3 whitespace-nowrap text-muted-foreground">
                              {examPeriod(exam)}
                            </td>
                            <td className="py-3 pe-4 text-end">
                              <ChevronRight
                                size={16}
                                className="ms-auto text-muted-foreground"
                                aria-hidden
                              />
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
      ) : (
        <div id="exam-panel-rooms" role="tabpanel" aria-label="Rooms">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Exam rooms</CardTitle>
                  <CardDescription>
                    {halls.length} room{halls.length === 1 ? "" : "s"} ·{" "}
                    {halls.reduce((sum, hall) => sum + (hall.capacity || 0), 0)} seats
                  </CardDescription>
                </div>
                <Link
                  href="/school/admin/exams/rooms"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open Room Wizard →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {halls.length === 0 ? (
                <EmptyState
                  icon={DoorOpen}
                  title="No rooms yet"
                  description="Create the first room so exams can seat candidates."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pe-3 ps-4 text-start font-medium">Room Name / Class</th>
                        <th className="py-2.5 pe-3 text-start font-medium">Room Number</th>
                        <th className="py-2.5 pe-3 text-start font-medium">Capacity</th>
                        <th className="w-12 py-2.5 pe-4 text-end font-medium">
                          <span className="sr-only">Manage</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {halls.map((hall) => (
                        <tr
                          key={hall.id}
                          role="link"
                          tabIndex={0}
                          onClick={() => router.push(`/school/admin/exams/rooms/${hall.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/school/admin/exams/rooms/${hall.id}`);
                            }
                          }}
                          className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="py-3 pe-3 ps-4 font-medium">{classOfRoom(hall.name)}</td>
                          <td className="py-3 pe-3 tabular-nums text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <LayoutGrid size={12} aria-hidden />
                              {roomNumberOf(hall.name) ?? "—"}
                            </span>
                          </td>
                          <td className="py-3 pe-3 tabular-nums text-muted-foreground">
                            {hall.capacity}
                          </td>
                          <td className="py-3 pe-4 text-end">
                            <ChevronRight
                              size={16}
                              className="ms-auto text-muted-foreground"
                              aria-hidden
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
