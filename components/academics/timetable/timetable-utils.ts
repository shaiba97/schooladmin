import type { ApiTimetableEntry } from "@/lib/api/types";

/**
 * Read-only subsets of the academic timetable math (components/academics/
 * timetable-utils.ts there): the week days, period banding and per-day
 * lesson/break sequencing the grids need. Everything save-specific
 * (coverage warnings, overlap validation) is intentionally absent.
 */

/** Every value the DayOfWeek enum accepts. */
export const ALL_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type DayOfWeek = (typeof ALL_DAYS)[number];

/** The school week the timetable UI is built around: Mon/Tue/Wed/Thu/Sat. */
export const TIMETABLE_DAYS = ["MON", "TUE", "WED", "THU", "SAT"] as const;
export type TimetableDay = DayOfWeek;

/** The grid renders these periods; rows can grow to cover higher periods found in data. */
export const PERIOD_COUNT = 9;
export const PERIOD_START_HOUR = 7;
export const PERIOD_LENGTH_MINUTES = 50;

const DAY_LABELS: Record<DayOfWeek, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

export function dayLabel(day: DayOfWeek) {
  return DAY_LABELS[day] ?? day;
}

/** "1st", "2nd", "3rd" — the row headers the timetable is specified to use. */
export function periodLabel(slot: number) {
  const remainder = slot % 100;
  if (remainder >= 11 && remainder <= 13) return `${slot}th`;
  switch (slot % 10) {
    case 1: return `${slot}st`;
    case 2: return `${slot}nd`;
    case 3: return `${slot}rd`;
    default: return `${slot}th`;
  }
}

type TeacherReference = {
  id?: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
  employeeNumber?: string | null;
};

function toTimeLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Start/end the grid shows for a period when there is no stored cell. */
export function defaultPeriodTimes(slot: number) {
  const start = PERIOD_START_HOUR * 60 + (slot - 1) * PERIOD_LENGTH_MINUTES;
  return { startTime: toTimeLabel(start), endTime: toTimeLabel(start + PERIOD_LENGTH_MINUTES) };
}

function defaultPeriodBand(slot: number) {
  const { startTime, endTime } = defaultPeriodTimes(slot);
  return `${startTime} – ${endTime}`;
}

export function buildPeriodRows(entries: Pick<ApiTimetableEntry, "periodNo">[]): { slot: number; band: string }[] {
  const slots = new Set<number>(Array.from({ length: PERIOD_COUNT }, (_, index) => index + 1));
  entries.forEach((entry) => slots.add(entry.periodNo));
  return [...slots].sort((left, right) => left - right).map((slot) => ({ slot, band: defaultPeriodBand(slot) }));
}

export function buildWeekDays(entries: Pick<ApiTimetableEntry, "dayOfWeek">[]): TimetableDay[] {
  const present = new Set<string>(entries.map((entry) => entry.dayOfWeek));
  const schoolWeek = new Set<string>(TIMETABLE_DAYS);
  const extras = ALL_DAYS.filter((day) => !schoolWeek.has(day) && present.has(day));
  return [...TIMETABLE_DAYS, ...extras];
}

export type PlacedCell<T> = { key: string; cell: T };

export type DaySequence<T> = {
  /** Lessons in time order; the index (+1) is the displayed period number. */
  lessons: Array<PlacedCell<T>>;
  /** Breaks in time order, each rendered attached after its preceding lesson. */
  breaks: Array<PlacedCell<T>>;
};

export function sequenceDay<T extends { startTime: string }>(
  dayCells: Array<PlacedCell<T>>,
  isBreak: (cell: T) => boolean,
): DaySequence<T> {
  const ordered = [...dayCells].sort((left, right) => left.cell.startTime.localeCompare(right.cell.startTime));
  return {
    lessons: ordered.filter(({ cell }) => !isBreak(cell)),
    breaks: ordered.filter(({ cell }) => isBreak(cell)),
  };
}

export function breaksAfterLesson<T extends { startTime: string }>(
  breaks: Array<PlacedCell<T>>,
  lessons: Array<PlacedCell<T>>,
  lessonIndex: number,
): Array<PlacedCell<T>> {
  const current = lessons[lessonIndex];
  if (!current) return [];
  const next = lessons[lessonIndex + 1];
  return breaks.filter(
    ({ cell }) =>
      cell.startTime >= current.cell.startTime && (!next || cell.startTime < next.cell.startTime),
  );
}

export function leadingBreaks<T extends { startTime: string }>(
  breaks: Array<PlacedCell<T>>,
  lessons: Array<PlacedCell<T>>,
): Array<PlacedCell<T>> {
  const first = lessons[0];
  if (!first) return breaks;
  return breaks.filter(({ cell }) => cell.startTime < first.cell.startTime);
}

export function teacherName(teacher: TeacherReference | null | undefined) {
  const name = [teacher?.user?.firstName, teacher?.user?.lastName].filter(Boolean).join(" ");
  return name || teacher?.employeeNumber || "Unassigned";
}
