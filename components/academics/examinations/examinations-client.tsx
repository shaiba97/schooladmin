"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, ClipboardCheck, DoorOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApiExam, ApiExamType, ApiGradingScale, ApiHall, ApiPaginated, ApiSchoolClass, ApiTimetableEntry } from "@/lib/api/types";
import { bandLabel } from "@/lib/api/grading";
import { ExamsTab } from "./exams-tab";
import { ExamTimetablesTab } from "./exam-timetable-tab";

const TABS = [
  { id: "exams" as const, label: "Exams", icon: ClipboardCheck },
  { id: "timetables" as const, label: "Timetables", icon: CalendarDays },
  { id: "grading" as const, label: "Grading", icon: GraduationCap },
  { id: "types" as const, label: "Exam types", icon: CalendarClock },
  { id: "halls" as const, label: "Halls", icon: DoorOpen },
];

type TabId = (typeof TABS)[number]["id"];

/**
 * Examination Center. Read-only exam surfaces: the Exams tab is a master
 * table linking to detail pages under /academic/examinations/exams/[id];
 * Timetables views exam/test week grids from the academic portal;
 * grading scales, exam types and halls are reference data.
 */
export function ExaminationsClient({
  initialTab,
  exams,
  examTypes,
  gradingScales,
  classes,
  halls,
  timetableEntries,
  loadError,
}: {
  initialTab?: string;
  exams: ApiPaginated<ApiExam>;
  examTypes: ApiExamType[];
  gradingScales: ApiGradingScale[];
  classes: ApiSchoolClass[];
  halls: ApiHall[];
  timetableEntries: ApiTimetableEntry[];
  loadError: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>(
    TABS.some((entry) => entry.id === initialTab) ? (initialTab as TabId) : "exams",
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ClipboardCheck size={20} aria-hidden /> Examination Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "exams"
            ? "Scheduled exams, their subjects, halls and results — read-only from the academic portal."
            : tab === "timetables"
              ? "Exam and test week grids created in the academic portal."
              : tab === "grading"
                ? "Grading scales and their bands."
                : tab === "types"
                  ? "Exam type catalogue used when scheduling."
                  : "Exam halls and their seating capacity."}
        </p>
      </div>

      <div className="flex w-fit gap-1.5 rounded-lg bg-muted p-1 print:hidden" role="tablist" aria-label="Examination Center">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              id={`exam-tab-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`exam-panel-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active ? "border bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} aria-hidden /> {entry.label}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive print:hidden">
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>Retry</Button>
        </div>
      ) : null}

      <div id={`exam-panel-${tab}`} role="tabpanel" aria-labelledby={`exam-tab-${tab}`} className="space-y-4">
        {tab === "exams" ? (
          <ExamsTab
            initialData={exams}
            types={examTypes}
            classes={classes}
          />
        ) : tab === "timetables" ? (
          <ExamTimetablesTab
            yearEntries={timetableEntries}
            classes={classes}
          />
        ) : tab === "grading" ? (
          <GradingPanel scales={gradingScales} />
        ) : tab === "types" ? (
          <TypesPanel types={examTypes} />
        ) : (
          <HallsPanel halls={halls} />
        )}
      </div>
    </div>
  );
}

function GradingPanel({ scales }: { scales: ApiGradingScale[] }) {
  if (scales.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No grading scales yet"
        description="Create a grading scale before attaching it to exam subjects."
      />
    );
  }
  return (
    <div className="rounded-lg border divide-y">
      {scales.map((scale) => (
        <div key={scale.id} className="px-3 py-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{scale.name}</p>
            {scale.isDefault ? <Badge variant="secondary">Default</Badge> : null}
            <span className="text-xs text-muted-foreground">{scale.bands?.length ?? 0} bands</span>
          </div>
          {(scale.bands?.length ?? 0) > 0 ? (
            <p className="text-xs text-muted-foreground">
              {[...(scale.bands ?? [])]
                .sort((a, b) => Number(b.maxPercent) - Number(a.maxPercent))
                .map((band) => bandLabel(band))
                .join(" · ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TypesPanel({ types }: { types: ApiExamType[] }) {
  if (types.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No exam types yet"
        description="Exam types categorise exams when scheduling them."
      />
    );
  }
  return (
    <div className="rounded-lg border divide-y">
      {types.map((type) => (
        <div key={type.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="text-sm font-medium">{type.name}</p>
          {type.defaultWeight != null ? <Badge variant="outline">Weight {String(type.defaultWeight)}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

function HallsPanel({ halls }: { halls: ApiHall[] }) {
  if (halls.length === 0) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="No halls yet"
        description="Add exam halls before assigning seating."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {halls.map((hall) => (
        <Card key={hall.id}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DoorOpen size={14} className="text-muted-foreground" aria-hidden />
              {hall.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={hall.type === "VIRTUAL" ? "purple" : "secondary"}>{hall.type === "VIRTUAL" ? "Virtual" : "Physical"}</Badge>
              <Badge variant="outline">{hall.capacity} seats</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
