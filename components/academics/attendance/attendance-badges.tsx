"use client";

import * as React from "react";
import { Check } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ABSENT: "bg-red-100 text-red-700 border-red-200",
  LATE: "bg-amber-100 text-amber-700 border-amber-200",
  EXCUSED: "bg-sky-100 text-sky-700 border-sky-200",
  LEAVE: "bg-sky-100 text-sky-700 border-sky-200",
};

const STATUS_TEXT: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  LEAVE: "On leave",
};

/** Compact per-day pill for the week matrix. Same size for every status. */
export function DayAttendanceBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex h-6 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-2 text-xs text-muted-foreground/60">
        -
      </span>
    );
  }
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-input"}`}
    >
      {status === "PRESENT" && <Check size={11} />}
      {STATUS_TEXT[status] ?? status}
    </span>
  );
}

/** Muted placeholder cell for non-school days. */
export function WeekendCell() {
  return <span className="inline-flex h-6 items-center rounded-md bg-muted/50 px-2 text-xs text-muted-foreground/60">Weekend</span>;
}

/** Summary chip used in month-stat rows on the detail page. */
export function StatChip({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" | "warn" | "info" }) {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-red-100 text-red-700",
    warn: "bg-amber-100 text-amber-700",
    info: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className={`text-lg font-semibold ${tones[tone] ?? tones.default}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
