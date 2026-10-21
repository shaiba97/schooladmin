"use client";

import * as React from "react";
import type { ApiSchoolClass, ApiSubject, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import TimetableWeekGrid, { type WeekGridCell } from "./timetable-week-grid";
import {
  breaksAfterLesson,
  buildPeriodRows,
  buildWeekDays,
  leadingBreaks,
  sequenceDay,
  teacherName,
  type DaySequence,
  type TimetableDay,
} from "./timetable-utils";

/**
 * One Class tab card: the academic-style week grid (lesson sequence with
 * attached breaks) for a single class, built entirely from yearEntries.
 * Entries that carry only teacherId/classId ids resolve through the optional
 * lookup maps.
 */
export function ClassWeekCard({
  title,
  entries,
  subjects,
  teacherById,
  emptyHint,
}: {
  title: string;
  entries: ApiTimetableEntry[];
  subjects: ApiSubject[];
  teacherById?: Map<string, ApiTeacher>;
  emptyHint?: string;
}) {
  const subjectById = React.useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const sequence = React.useMemo(() => {
    const map = new Map<string, Array<{ key: string; cell: ApiTimetableEntry }>>();
    for (const entry of entries) {
      const bucket = map.get(entry.dayOfWeek) ?? [];
      bucket.push({ key: entry.id, cell: entry });
      map.set(entry.dayOfWeek, bucket);
    }
    const result = new Map<string, DaySequence<ApiTimetableEntry>>();
    for (const [day, cells] of map) {
      result.set(day, sequenceDay(cells, (cell) => Boolean(cell.isBreak)));
    }
    return result;
  }, [entries]);

  const days = React.useMemo(() => buildWeekDays(entries), [entries]);
  const rows = React.useMemo(() => buildPeriodRows(entries), [entries]);

  const teacherFor = React.useCallback(
    (entry: ApiTimetableEntry): ApiTeacher | null | undefined =>
      entry.teacher ?? (entry.teacherId ? teacherById?.get(entry.teacherId) : undefined),
    [teacherById],
  );

  const cellAt = React.useCallback(
    (day: TimetableDay, lessonNo: number): WeekGridCell | undefined => {
      const daySeq = sequence.get(day);
      const lessons = daySeq?.lessons ?? [];
      const placed = lessons[lessonNo - 1];
      if (!placed) return undefined;
      const { cell } = placed;
      const refSubject = cell.subject?.id ? subjectById.get(cell.subject.id) : undefined;
      const subject = cell.subject ?? refSubject;
      const teacher = teacherFor(cell);
      const chips = [
        ...(lessonNo === 1 ? leadingBreaks(daySeq?.breaks ?? [], lessons) : []),
        ...breaksAfterLesson(daySeq?.breaks ?? [], lessons, lessonNo - 1),
      ].map((placedBreak) => ({
        primary: "Break",
        secondary: `${placedBreak.cell.startTime}–${placedBreak.cell.endTime}`,
      }));
      return {
        isBreak: false,
        primary: subject?.name || "Subject",
        secondary: teacher ? teacherName(teacher) : "Unassigned",
        tertiary: `${cell.startTime}–${cell.endTime}`,
        attached: chips.length > 0 ? chips : undefined,
      };
    },
    [sequence, subjectById, teacherFor],
  );

  return (
    <TimetableWeekGrid title={title} days={days} rows={rows} cellAt={cellAt} emptyHint={emptyHint} />
  );
}

/** One Teacher tab card: lessons placed strictly by stored periodNo. */
export function TeacherWeekCard({
  title,
  entries,
  classes,
}: {
  title: string;
  entries: ApiTimetableEntry[];
  classes?: ApiSchoolClass[];
}) {
  const classById = React.useMemo(
    () => (classes ? new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass])) : undefined),
    [classes],
  );
  const days = React.useMemo(() => buildWeekDays(entries), [entries]);
  const rows = React.useMemo(() => buildPeriodRows(entries), [entries]);
  const byDayPeriod = React.useMemo(() => {
    const map = new Map<string, ApiTimetableEntry>();
    for (const entry of entries) {
      map.set(`${entry.dayOfWeek}:${entry.periodNo}`, entry);
    }
    return map;
  }, [entries]);
  const classLabel = React.useCallback(
    (entry: ApiTimetableEntry) => {
      const resolved = entry.schoolClass ?? (entry.classId ? classById?.get(entry.classId) : undefined);
      return resolved?.className ?? "Class";
    },
    [classById],
  );
  const cellAt = React.useCallback(
    (day: TimetableDay, slot: number): WeekGridCell | undefined => {
      const entry = byDayPeriod.get(`${day}:${slot}`);
      if (!entry) return undefined;
      if (entry.isBreak) {
        return { isBreak: true, primary: "Break", secondary: `${entry.startTime}–${entry.endTime}` };
      }
      return {
        isBreak: false,
        primary: entry.subject?.name || "Subject",
        secondary: classLabel(entry),
        tertiary: `${entry.startTime}–${entry.endTime}`,
      };
    },
    [byDayPeriod, classLabel],
  );

  return (
    <TimetableWeekGrid title={title} days={days} rows={rows} cellAt={cellAt} emptyHint="No lessons scheduled for this teacher yet." />
  );
}

/** Lowercased haystack ("Name employeenum") that both searches match against. */
export function teacherSearchText(teacher: ApiTeacher | null | undefined): string {
  if (!teacher) return "";
  const name = teacherName(teacher);
  return `${name} ${teacher.employeeNumber ?? ""}`.toLowerCase();
}
