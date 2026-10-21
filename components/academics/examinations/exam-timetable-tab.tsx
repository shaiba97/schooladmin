"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApiSchoolClass, ApiTimetableEntry } from "@/lib/api/types";
import { ClassWeekCard } from "../timetable/timetable-cards";

const EXAM_TIMETABLE_TYPES = [
  { id: "EXAMINATION" as const, label: "Exam timetables" },
  { id: "TEST" as const, label: "Test timetables" },
];

/**
 * Read-only viewer for exam/test week grids. Data comes from the year-wide
 * timetable feed, filtered to the TEST and EXAMINATION types — these weeks
 * are created in the academic portal and never edited here.
 */
export function ExamTimetablesTab({
  yearEntries,
  classes,
}: {
  yearEntries: ApiTimetableEntry[];
  classes: ApiSchoolClass[];
}) {
  const [type, setType] = React.useState<(typeof EXAM_TIMETABLE_TYPES)[number]["id"]>("EXAMINATION");
  const [examName, setExamName] = React.useState("");

  const relevant = React.useMemo(
    () => yearEntries.filter((entry) => (entry.timetableType ?? "REGULAR") === type),
    [yearEntries, type],
  );

  const examNames = React.useMemo(() => {
    const unique = [...new Set(relevant.map((entry) => entry.examName ?? ""))];
    // Named weeks first; an unnamed week cluster stays selectable but last.
    return unique.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  }, [relevant]);

  React.useEffect(() => {
    setExamName((current) => (examNames.includes(current) ? current : examNames[0] ?? ""));
    // Reset the selection whenever the feed or type changes.
  }, [examNames]);

  const wanted = React.useMemo(
    () => (examNames.length === 0 ? "" : examNames.includes(examName) ? examName : examNames[0] ?? ""),
    [examName, examNames],
  );

  const scoped = React.useMemo(
    () => (wanted === "" && !examNames.includes("") ? [] : relevant.filter((entry) => (entry.examName ?? "") === wanted)),
    [relevant, wanted, examNames],
  );

  const classById = React.useMemo(
    () => new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass])),
    [classes],
  );

  if (relevant.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={`No ${type === "TEST" ? "test" : "exam"} timetables yet`}
        description="Exam and test weeks are scheduled in the academic portal; they appear here once created."
      />
    );
  }

  const groups = [...new Map(
    scoped.flatMap((entry) => {
      const classId = entry.classId ?? entry.schoolClass?.id;
      if (!classId) return [];
      const className = entry.schoolClass?.className ?? classById.get(classId)?.className ?? classId;
      return [[classId, className] as const];
    }),
  ).entries()]
    .map(([classId, className]) => ({
      classId,
      className,
      entries: scoped.filter((entry) => (entry.classId ?? entry.schoolClass?.id) === classId),
    }))
    .sort((left, right) => left.className.localeCompare(right.className));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
        <label htmlFor="exam-timetable-type" className="text-muted-foreground">Type</label>
        <select
          id="exam-timetable-type"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
          aria-label="Timetable type"
        >
          {EXAM_TIMETABLE_TYPES.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.label}</option>
          ))}
        </select>
        {examNames.length > 0 ? (
          <>
            <label htmlFor="exam-timetable-name" className="text-muted-foreground">Exam</label>
            <select
              id="exam-timetable-name"
              value={wanted}
              onChange={(event) => setExamName(event.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
              aria-label="Exam name"
            >
              {examNames.map((name) => (
                <option key={name || "(unnamed)"} value={name}>{name || "(unnamed)"}</option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="grid gap-4">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No class slots match the selected exam yet.
          </p>
        ) : groups.map((group) => {
          const title = `${group.className} · ${wanted || "(unnamed)"}`;
          return (
            <article key={`${group.classId}:${wanted}`} className="min-w-0">
              <ClassWeekCard
                title={title}
                entries={group.entries}
                subjects={[]}
                emptyHint={`No ${type === "TEST" ? "test" : "exam"} slots recorded for this class yet.`}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
