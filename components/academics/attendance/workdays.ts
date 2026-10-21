/**
 * Week-window and school-day derivation for the attendance workspace.
 *
 * Date rules:
 * - Every key is a plain `YYYY-MM-DD` parsed/packed as UTC midnight; all
 *   arithmetic and label components use UTC getters.
 * - The only local-clock read is `todayKey()` (local calendar day parts),
 *   because "today" is the school's wall date, not the UTC date. Callers
 *   re-derive it per render, so a page left open across midnight fixes
 *   itself on refill/navigation.
 * - Keys fed into this module must come from internal generation or a
 *   validated source: `fromDayKey` trusts the input shape (`2026-02-30`
 *   would roll over silently).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function utcLabel(key: string, withYear: boolean): string {
  const date = fromDayKey(key);
  const base = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return withYear ? `${base}, ${date.getUTCFullYear()}` : base;
}

/** Local wall-calendar date key (the school's "today"). */
export function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const DAY_OF_WEEK_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
/**
 * DAY_OF_WEEK_KEYS mirrors Prisma's `DayOfWeek` enum order (SUN..SAT) —
 * `DAY_OF_WEEK_KEYS[date.getUTCDay()]` relies on that identity.
 */
export type DayOfWeekKey = (typeof DAY_OF_WEEK_KEYS)[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDayKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Backend DATE columns serialize as full ISO ("2026-10-16T00:00:00.000Z")
 * on some endpoints and plain keys on others; this collapses either to the
 * plain `YYYY-MM-DD` key every workspace/calendar helper expects.
 */
export function dateKeyOf(value: string): string {
  return value.length > 10 ? value.slice(0, 10) : value;
}

export function addDays(key: string, offset: number): string {
  const date = fromDayKey(key);
  date.setUTCDate(date.getUTCDate() + offset);
  return toDayKey(date);
}

/** A column in the week matrix: one calendar day of the active window. */
export type AttendanceDayColumn = {
  dateKey: string;
  /** Short weekday name, e.g. "Sun". */
  weekday: string;
  /** "13/10" day/month label for the column header. */
  dateLabel: string;
  isToday: boolean;
  /** Timetable-derived school day; non-school days render Weekend placeholders. */
  isSchoolDay: boolean;
};

/** The 7-day window (Mon→Sun) containing `anchorKey`. */
export function weekWindow(anchorKey: string): AttendanceDayColumn[] {
  const anchor = fromDayKey(anchorKey);
  const daysFromMonday = (anchor.getUTCDay() + 6) % 7; // Monday=0 … Sunday=6
  const mondayKey = addDays(anchorKey, -daysFromMonday);
  const now = todayKey();

  return Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDays(mondayKey, i);
    const date = fromDayKey(dateKey);
    const index = date.getUTCDay();
    return {
      dateKey,
      weekday: DAY_LABELS[index],
      dateLabel: `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      isToday: dateKey === now,
      isSchoolDay: true,
    };
  });
}

/**
 * Marks the columns of a week window as school days or off-days. Input
 * contract: `timetableDayKeys` must carry the `dayOfWeek` values of NON-BREAK
 * REGULAR entries only (caller filters isBreak/timetableType). Unknown day
 * tokens are ignored; a scope with no recognizable days renders the full
 * 7 days as school days — no fabricated weekends.
 */
export function applySchoolDays(
  columns: AttendanceDayColumn[],
  timetableDayKeys: readonly string[],
): AttendanceDayColumn[] {
  const known = new Set<string>(DAY_OF_WEEK_KEYS);
  const schoolSet = new Set(
    timetableDayKeys
      .map((day) => day.trim().toUpperCase())
      .filter((day) => known.has(day)),
  );
  if (schoolSet.size === 0) return columns.map((column) => ({ ...column }));
  return columns.map((column) => ({
    ...column,
    isSchoolDay: schoolSet.has(DAY_OF_WEEK_KEYS[fromDayKey(column.dateKey).getUTCDay()]),
  }));
}

/** "Mon 13/10" style header. */
export function dayHeaderLabel(column: AttendanceDayColumn): string {
  return `${column.weekday} ${column.dateLabel}`;
}

/**
 * Window title across the first → last school day ("Oct 12 – Oct 16, 2026").
 * Falls back to the full Monday→Sunday span when nothing is a school day.
 */
export function weekTitle(columns: AttendanceDayColumn[]): string {
  if (columns.length === 0) return "";
  const schoolDays = columns.filter((column) => column.isSchoolDay);
  const span = schoolDays.length > 0 ? schoolDays : columns;
  const first = span[0]!;
  const last = span[span.length - 1]!;
  return first.dateKey === last.dateKey
    ? utcLabel(first.dateKey, true)
    : `${utcLabel(first.dateKey, false)} – ${utcLabel(last.dateKey, true)}`;
}
