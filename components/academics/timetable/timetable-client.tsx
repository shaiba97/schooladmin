"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, GraduationCap, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIMETABLE_TYPES, type TimetableTypeId } from "@/lib/api/types";
import type { ApiSchoolClass, ApiSubject, ApiTeacher, ApiTimetableEntry } from "@/lib/api/types";
import { teacherName } from "./timetable-utils";
import { ClassWeekCard, TeacherWeekCard, teacherSearchText } from "./timetable-cards";

const TABS = [
  { id: "class" as const, label: "Class", icon: GraduationCap },
  { id: "teacher" as const, label: "Teacher", icon: Users },
];

type TabId = (typeof TABS)[number]["id"];

function typeLabel(type: string) {
  return TIMETABLE_TYPES.find((entry) => entry.id === type)?.label ?? type;
}

function comboKey(entry: ApiTimetableEntry) {
  const type = entry.timetableType ?? "REGULAR";
  return `${type}:${type === "EXAMINATION" ? entry.examName ?? "" : ""}`;
}

function comboTitle(type: string, examName: string) {
  return `${typeLabel(type)}${examName ? ` · ${examName}` : ""}`;
}

/**
 * Admin timetable workspace. The Class and Teacher tabs render every week
 * grid at once from the year-wide timetable feed — the Class tab one card
 * per class (per exam timetable in EXAMINATION mode), the Teacher tab one
 * card per teacher/type combo — one grid per row. The search target follows
 * the tab: the Class tab searches class names, the Teacher tab searches
 * teacher names/employee numbers.
 */
export function TimetableClient({
  initialTab,
  classes = [],
  subjects = [],
  teachers = [],
  yearEntries = [],
  refsError = "",
}: {
  initialTab?: string;
  classes?: ApiSchoolClass[];
  subjects?: ApiSubject[];
  teachers?: ApiTeacher[];
  yearEntries?: ApiTimetableEntry[];
  refsError?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>(
    TABS.some((entry) => entry.id === initialTab) ? (initialTab as TabId) : "class",
  );
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<TimetableTypeId>("REGULAR");
  const [examName, setExamName] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  function selectTab(next: TabId) {
    setTab(next);
    setSearch("");
  }

  function clearSearch() {
    setSearch("");
    searchInputRef.current?.focus();
  }

  const deferredSearch = React.useDeferredValue(search);
  const searchNeedle = deferredSearch.trim().toLowerCase();
  const examFilter = type === "EXAMINATION" ? examName.trim().toLowerCase() : "";

  const teacherById = React.useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );
  const classNameMatches = React.useCallback(
    (className: string | undefined, needle: string) => needle === "" || (className ?? "").toLowerCase().includes(needle),
    [],
  );

  const classCards = React.useMemo(() => {
    const byClassId = new Map<string, ApiTimetableEntry[]>();
    const examGroups = new Map<string, { classId: string; examName: string; entries: ApiTimetableEntry[] }>();
    for (const entry of yearEntries) {
      const classId = entry.classId ?? entry.schoolClass?.id;
      if (!classId) continue;
      if ((entry.timetableType ?? "REGULAR") !== type) continue;
      if (type === "EXAMINATION") {
        const entryExam = entry.examName ?? "";
        if (examFilter && entryExam.trim().toLowerCase() !== examFilter) continue;
        const key = `${classId}:${entryExam}`;
        let group = examGroups.get(key);
        if (!group) {
          group = { classId, examName: entryExam, entries: [] };
          examGroups.set(key, group);
        }
        group.entries.push(entry);
      } else {
        let bucket = byClassId.get(classId);
        if (!bucket) {
          bucket = [];
          byClassId.set(classId, bucket);
        }
        bucket.push(entry);
      }
    }
    const examTotal = [...examGroups.values()].filter((group) => {
      const classRef = classes.find((schoolClass) => schoolClass.id === group.classId);
      return Boolean(classRef && classNameMatches(classRef.className, searchNeedle));
    }).length;

    const cards = type === "EXAMINATION"
      ? [...examGroups.values()]
          .flatMap((group) => {
            const classRef = classes.find((schoolClass) => schoolClass.id === group.classId);
            if (!classRef || !classNameMatches(classRef.className, searchNeedle)) return [];
            const title = `${classRef.className} · ${comboTitle(type, group.examName)}`;
            return [{ key: `cls:${group.classId}:exam:${group.examName}`, title, node: <ClassWeekCard title={title} entries={group.entries} subjects={subjects} teacherById={teacherById} /> }];
          })
      : classes
          .flatMap((schoolClass) => {
            if (!classNameMatches(schoolClass.className, searchNeedle)) return [];
            const entries = byClassId.get(schoolClass.id) ?? [];
            const title = `${schoolClass.className} · ${comboTitle(type, "")}`;
            return [{
              key: `cls:${schoolClass.id}`,
              title,
              node: <ClassWeekCard title={title} entries={entries} subjects={subjects} teacherById={teacherById} emptyHint="No timetable recorded for this class yet." />,
            }];
          });
    return {
      cards: cards.sort((left, right) => left.title.localeCompare(right.title)),
      total: type === "EXAMINATION" ? examTotal : classes.filter((schoolClass) => classNameMatches(schoolClass.className, searchNeedle)).length,
    };
  }, [yearEntries, classes, subjects, teacherById, classNameMatches, type, examFilter, searchNeedle]);

  const teacherCards = React.useMemo(() => {
    const byTeacher = new Map<string, Map<string, { type: string; examName: string; entries: ApiTimetableEntry[] }>>();
    for (const entry of yearEntries) {
      if (entry.isBreak) continue;
      const teacherId = entry.teacherId ?? entry.teacher?.id;
      if (!teacherId) continue;
      let combos = byTeacher.get(teacherId);
      if (!combos) {
        combos = new Map();
        byTeacher.set(teacherId, combos);
      }
      const key = comboKey(entry);
      let group = combos.get(key);
      if (!group) {
        const entryType = entry.timetableType ?? "REGULAR";
        group = { type: entryType, examName: entryType === "EXAMINATION" ? entry.examName ?? "" : "", entries: [] };
        combos.set(key, group);
      }
      group.entries.push(entry);
    }
    const rows = teachers
      .map((teacher) => {
        const combos = byTeacher.get(teacher.id);
        if (!combos || combos.size === 0) {
          return [{ teacher, type: "", examName: "", entries: [] as ApiTimetableEntry[] }];
        }
        return [...combos.values()].map((group) => ({ teacher, type: group.type, examName: group.examName, entries: group.entries }));
      })
      .flat();
    const cards = rows
      .filter((row) => searchNeedle === "" || teacherSearchText(row.teacher).includes(searchNeedle))
      .sort(
        (left, right) =>
          teacherName(left.teacher).localeCompare(teacherName(right.teacher)) ||
          `${left.type}:${left.examName}`.localeCompare(`${right.type}:${right.examName}`),
      )
      .map((row) => {
        const title = row.type === "" ? teacherName(row.teacher) : `${teacherName(row.teacher)} · ${comboTitle(row.type, row.examName)}`;
        return {
          key: `tch:${row.teacher.id}:${row.type}:${row.examName}`,
          title,
          node: <TeacherWeekCard title={title} entries={row.entries} classes={classes} />,
        };
      });
    return { cards, total: rows.length };
  }, [yearEntries, classes, teachers, searchNeedle]);

  const visible = tab === "class" ? classCards : teacherCards;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Clock size={20} aria-hidden /> Timetables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every {tab === "class" ? "class" : "teacher"} timetable below — one per row, searchable by {tab === "class" ? "class" : "teacher"} name.
          </p>
        </div>
      </div>

      <div className="flex w-fit gap-1.5 rounded-lg bg-muted p-1 print:hidden" role="tablist" aria-label="Timetable view">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              id={`timetable-tab-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`timetable-panel-${entry.id}`}
              onClick={() => selectTab(entry.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active ? "border bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} aria-hidden /> {entry.label}
            </button>
          );
        })}
      </div>

      {refsError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive print:hidden">
          <span>{refsError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>Retry</Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
        <label htmlFor="timetable-search" className="text-muted-foreground">Search</label>
        <div className="relative">
          <input
            ref={searchInputRef}
            id="timetable-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") clearSearch();
            }}
            placeholder={tab === "class" ? "Search by class name…" : "Search by teacher name or number…"}
            aria-controls="timetable-grid"
            className="h-9 w-60 rounded-md border border-input bg-transparent pl-2.5 pr-8 text-sm placeholder:text-muted-foreground/60 focus-visible:outline focus-visible:outline-ring"
          />
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-ring"
            >
              <X size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        {search.trim() ? (
          <span aria-live="polite" className="text-xs text-muted-foreground">
            {visible.cards.length} of {visible.total} shown
          </span>
        ) : null}
      </div>

      <div id={`timetable-panel-${tab}`} role="tabpanel" aria-labelledby={`timetable-tab-${tab}`} className="space-y-4">
        {tab === "class" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
              <label htmlFor="timetable-type" className="text-muted-foreground">Timetable type</label>
              <select
                id="timetable-type"
                value={type}
                onChange={(event) => setType(event.target.value as TimetableTypeId)}
                className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
                aria-label="Timetable type"
              >
                {TIMETABLE_TYPES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
              </select>
              {type === "EXAMINATION" ? (
                <>
                  <label htmlFor="timetable-exam" className="text-muted-foreground">Exam</label>
                  <input
                    id="timetable-exam"
                    value={examName}
                    onChange={(event) => setExamName(event.target.value)}
                    placeholder="e.g. Midterm"
                    maxLength={150}
                    className="h-9 w-48 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline focus-visible:outline-ring"
                  />
                </>
              ) : null}
            </div>
            <CardGrid cards={classCards.cards} emptyMessage="No class timetable matches your search." />
          </div>
        ) : (
          <CardGrid cards={teacherCards.cards} emptyMessage="No teacher timetable matches your search." />
        )}
      </div>
    </div>
  );
}

function CardGrid({
  cards,
  emptyMessage,
}: {
  cards: Array<{ key: string; title: string; node: React.ReactNode }>;
  emptyMessage: string;
}) {
  return (
    <div id="timetable-grid">
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <article key={card.key} className="min-w-0">
              {card.node}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
