"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  ApiExam,
  ApiExamType,
  ApiGradingScale,
  ApiHall,
  ApiPaginated,
  ApiSchoolClass,
  ApiTimetableEntry,
} from "@/lib/api/types";
import { bandLabel } from "@/lib/api/grading";
import { ExamsTab } from "./exams-tab";
import { ExamTimetablesTab } from "./exam-timetable-tab";

const TABS = [
  { id: "exams" as const, label: "Exams", icon: ClipboardCheck },
  { id: "timetables" as const, label: "Timetables", icon: CalendarDays },
  { id: "grading" as const, label: "Grading", icon: GraduationCap },
  { id: "types" as const, label: "Exam types", icon: CalendarClock },
];

type TabId = (typeof TABS)[number]["id"];

/**
 * Examination Center hub: three wizards (exam, rooms, results) plus the
 * reference surfaces. Wizards own the write flows; the tabs stay read-mostly
 * overviews over the same data.
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

  const roomCapacity = halls.reduce((sum, hall) => sum + (hall.capacity || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Academic Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ClipboardCheck size={20} className="text-primary" aria-hidden /> Examination Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Schedule exams, prepare the rooms that seat candidates, and publish results — everything
            in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
          <Link
            href="/school/admin/exams/create"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles size={14} aria-hidden /> New exam
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WizardCard
          icon={ClipboardList}
          eyebrow="Step 1"
          title="Exam Wizard"
          description="Name the exam, pick the grade and classes, attach subject papers with sample uploads, then choose the rooms."
          href="/school/admin/exams/create"
          action="Schedule an exam"
          meta={`${exams.total} exam${exams.total === 1 ? "" : "s"} on record`}
        />
        <WizardCard
          icon={DoorOpen}
          eyebrow="Step 2"
          title="Room Wizard"
          description="Create one room per class, set seating capacity and review the seating allocation for each exam."
          href="/school/admin/exams/rooms"
          action="Manage rooms"
          meta={`${halls.length} room${halls.length === 1 ? "" : "s"} · ${roomCapacity} seats`}
        />
        <WizardCard
          icon={GraduationCap}
          eyebrow="Step 3"
          title="Results Wizard"
          description="Enter and correct marks per class, open the official result, and follow each student's performance history."
          href="/school/admin/exams/results"
          action="Open results"
          meta={`${classes.length} class${classes.length === 1 ? "" : "es"} in scope`}
        />
      </div>

      <div className="flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-lg bg-muted p-1 print:hidden" role="tablist" aria-label="Examination Center">
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
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                active
                  ? "border bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} aria-hidden /> {entry.label}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive print:hidden"
        >
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div
        id={`exam-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`exam-tab-${tab}`}
        className="space-y-4"
      >
        {tab === "exams" ? (
          <ExamsTab initialData={exams} types={examTypes} />
        ) : tab === "timetables" ? (
          <ExamTimetablesTab yearEntries={timetableEntries} classes={classes} />
        ) : tab === "grading" ? (
          <GradingPanel scales={gradingScales} />
        ) : (
          <TypesPanel types={examTypes} />
        )}
      </div>
    </div>
  );
}

function WizardCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  href,
  action,
  meta,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
  meta: string;
}) {
  return (
    <Card className="group relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent"
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon size={16} aria-hidden />
          </span>
          <Badge variant="outline">{eyebrow}</Badge>
        </div>
        <CardTitle className="mt-1 text-sm">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{meta}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {action}
          <ArrowRight
            size={14}
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </CardContent>
    </Card>
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
        <div key={scale.id} className="space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{scale.name}</p>
            {scale.isDefault ? <Badge variant="secondary">Default</Badge> : null}
            <span className="text-xs text-muted-foreground">
              {scale.bands?.length ?? 0} bands
            </span>
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
        <div key={type.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <p className="text-sm font-medium">{type.name}</p>
          {type.defaultWeight != null ? (
            <Badge variant="outline">Weight {String(type.defaultWeight)}</Badge>
          ) : null}
        </div>
      ))}
    </div>
  );
}
