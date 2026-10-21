"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableDay } from "./timetable-utils";
import { dayLabel, periodLabel } from "./timetable-utils";

/**
 * Read-only week grid — the inherited properties of the academic
 * TimetableWeekGrid (components/academics/timetable-week-grid.tsx there)
 * with every editing surface removed: no cell dialog, no drafts, no
 * selection, no save. Print stays (window.print()) because it is view-only.
 *
 * The grid is built to FIT its card instead of scrolling away columns:
 * the wrapper is a size container (@container) and every box, padding and
 * text size below is a cqw clamp that shrinks with the card width, capped
 * at the original fixed-pixel sizes so wide cards look exactly like before.
 */
export type WeekGridRow = { slot: number; band: string };

export type WeekGridCell = {
  isBreak: boolean;
  primary: string;
  secondary?: string;
  tertiary?: string;
  /** Breaks attached after this lesson in the day row. */
  attached?: Array<{ primary: string; secondary?: string }>;
  /** Search highlight: this lesson's teacher matched the active query. */
  match?: boolean;
};

export default function TimetableWeekGrid({
  title,
  meta,
  days,
  rows,
  dayMeta,
  cellAt,
  loading = false,
  onPrint,
  emptyHint,
}: {
  title: string;
  meta?: React.ReactNode;
  days: readonly TimetableDay[];
  rows: WeekGridRow[];
  dayMeta?: (day: TimetableDay) => React.ReactNode;
  cellAt: (day: TimetableDay, slot: number) => WeekGridCell | undefined;
  loading?: boolean;
  onPrint?: () => void;
  emptyHint?: string;
}) {
  const hasContent = rows.some((row) => days.some((day) => Boolean(cellAt(day, row.slot))));

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold" title={title}>{title}</h2>
          {meta ? <div className="mt-0.5 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {onPrint ? (
          <Button type="button" variant="outline" onClick={onPrint} className="print:hidden">
            <Printer size={15} aria-hidden /> Print
          </Button>
        ) : null}
      </div>

      <div className="@container overflow-x-auto rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label={`Loading ${title}`}>
            {rows.map((row) => <Skeleton key={row.slot} className="h-14 w-full" />)}
          </div>
        ) : !hasContent ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{emptyHint ?? "Nothing scheduled yet."}</p>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                <th scope="col" className="w-16 @[420px]:w-[104px] border-b bg-muted/40 px-1 py-2 text-left text-[clamp(8px,1.5cqw,12px)] font-medium text-muted-foreground @[420px]:px-3">Day</th>
                {rows.map((row) => (
                  <th key={row.slot} scope="col" className="border-b border-l bg-muted/40 px-1 py-2 text-center text-[clamp(8px,1.5cqw,12px)] font-semibold tracking-wide">
                    <span className="block">{periodLabel(row.slot)}</span>
                    {row.band ? <span className="@min-[520px]:mt-0.5 block font-normal text-muted-foreground @max-[519px]:sr-only">{row.band}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <th scope="row" className="border-b px-1 py-1.5 text-left align-top @[420px]:px-3">
                    <span className="block text-[clamp(8px,1.5cqw,12px)] font-semibold">{dayLabel(day)}</span>
                    {dayMeta ? <span className="mt-0.5 block text-[clamp(8px,1.4cqw,12px)] font-normal text-muted-foreground">{dayMeta(day)}</span> : null}
                  </th>
                  {rows.map((row) => {
                    const cell = cellAt(day, row.slot);
                    const key = `${day}:${row.slot}`;
                    const classes = `flex min-h-[clamp(40px,6.5cqw,64px)] w-full flex-col rounded-md border px-1 py-1 text-left ${
                      cell
                        ? cell.isBreak
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-primary/30 bg-primary/10"
                        : "border-transparent"
                    }${cell?.match ? " ring-2 ring-inset ring-amber-500/70" : ""}`;
                    const summaryText = "text-[clamp(9px,1.6cqw,12px)] truncate";
                    const content = cell ? (
                      <>
                        <span className={`block truncate text-[clamp(10px,1.8cqw,12px)] font-semibold ${cell.isBreak ? "text-amber-700" : "text-primary"}`}>{cell.primary}</span>
                        {cell.secondary ? <span className={`block text-foreground/80 ${summaryText}`}>{cell.secondary}</span> : null}
                        {cell.tertiary ? <span className={`block text-muted-foreground ${summaryText}`}>{cell.tertiary}</span> : null}
                      </>
                    ) : (
                      <span className="block text-[clamp(9px,1.6cqw,12px)] text-muted-foreground/60">—</span>
                    );
                    const attached = cell?.attached?.map((chip, index) => (
                      <div key={`${key}:break-${index}`} className="@min-[500px]:mt-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 @[500px]:px-1.5" aria-label={`${chip.primary} break`}>
                        <span className={`block truncate font-semibold text-amber-700 text-[clamp(9px,1.6cqw,12px)]`}>{chip.primary}</span>
                        {chip.secondary ? <span className={`block truncate text-muted-foreground ${summaryText}`}>{chip.secondary}</span> : null}
                      </div>
                    ));
                    const label = `${dayLabel(day)} period ${row.slot} — ${cell ? `${cell.primary}${cell.isBreak ? " (break)" : ""}` : "empty"}`;
                    return (
                      <td key={key} className="border-b border-l p-0.5 align-top">
                        <div className={classes} title={label} aria-label={label}>{content}{attached}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
