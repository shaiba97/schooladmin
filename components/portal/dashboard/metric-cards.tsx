"use client";

import { Banknote, GraduationCap, TrendingDown, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Metric = {
  key: string;
  label: string;
  value: string;
  caption: string;
  icon: typeof GraduationCap;
  accent: { chip: string; icon: string; valueClass: string };
  badge: { label: string; tone: "up" | "down" | "flat"; text: string } | null;
};

const ACCENTS = {
  emerald: {
    chip: "bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/25",
    icon: "text-emerald-600 dark:text-emerald-400",
    valueClass: "bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300",
  },
  teal: {
    chip: "bg-teal-500/10 ring-1 ring-teal-500/20 shadow-lg shadow-teal-500/25",
    icon: "text-teal-600 dark:text-teal-400",
    valueClass: "bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent dark:from-teal-300 dark:to-emerald-400",
  },
} as const;

export function MetricCards({
  loading,
  students,
  staffOnDuty,
  collections,
  cashFlow,
}: {
  loading: boolean;
  students: { value: string; caption: string } | null;
  staffOnDuty: { value: string; caption: string } | null;
  collections: { value: string; caption: string; pct: number | null } | null;
  cashFlow: { value: string; caption: string; pct: number | null; negative: boolean } | null;
}) {
  const metrics: Metric[] = [
    {
      key: "students",
      label: "Total active students",
      value: students?.value ?? "0",
      caption: students?.caption ?? "Enrolled headcount across tiers",
      icon: GraduationCap,
      accent: ACCENTS.emerald,
      badge: { label: "Live roster", tone: "flat", text: "across all tiers" },
    },
    {
      key: "staff",
      label: "Faculty & staff on duty",
      value: staffOnDuty?.value ?? "0",
      caption: staffOnDuty?.caption ?? "Active teaching and administrative personnel",
      icon: UsersRound,
      accent: ACCENTS.teal,
      badge: { label: "On duty", tone: "flat", text: "today" },
    },
    {
      key: "collections",
      label: "Monthly fee collections",
      value: collections?.value ?? "0",
      caption: collections?.caption ?? "Mada, KNET, and bank transfers vs outstanding",
      icon: Banknote,
      accent: ACCENTS.emerald,
      badge: collectionBadge(collections?.pct ?? null),
    },
    {
      key: "cashflow",
      label: "Operating cash flow",
      value: cashFlow?.value ?? "0",
      caption: cashFlow?.caption ?? "Revenue − teacher payouts − operational expenses",
      icon: Wallet,
      accent: ACCENTS.teal,
      badge: flowBadge(cashFlow?.pct ?? null),
    },
  ];

  return (
    <div aria-busy={loading} aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article
            key={metric.key}
            className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
            />
            <div className="flex items-start justify-between gap-2">
              <span
                aria-hidden
                className={`inline-flex size-10 items-center justify-center rounded-xl ${metric.accent.chip}`}
              >
                <Icon size={20} className={`${metric.accent.icon} transition-transform group-hover:scale-105`} />
              </span>
              {metric.badge ? <ChangeBadge badge={metric.badge} /> : null}
            </div>
            {loading ? (
              <>
                <Skeleton className="mt-4 h-8 w-32" />
                <Skeleton className="mt-3 h-2.5 w-40" />
              </>
            ) : (
              <>
                <p
                  className={`mt-4 text-2xl font-semibold tracking-tight tabular-nums ${
                    metric.key === "cashflow" && cashFlow?.negative ? "text-destructive" : metric.accent.valueClass
                  }`}
                >
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  <span className="font-medium text-foreground/70">{metric.label}</span> ·{" "}
                  <span className="text-muted-foreground">{metric.caption}</span>
                </p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function collectionBadge(pct: number | null): Metric["badge"] {
  if (pct === null) return { label: "No prior month", tone: "flat", text: "vs last month" };
  if (pct >= 0) return { label: `+${pct}% vs last month`, tone: "up", text: "collections rising" };
  return { label: `${pct}% vs last month`, tone: "down", text: "collections falling" };
}

function flowBadge(pct: number | null): Metric["badge"] {
  if (pct === null) return null;
  if (pct >= 0) return { label: `+${pct}% vs last month`, tone: "up", text: "cash flow rising" };
  return { label: `${pct}% vs last month`, tone: "down", text: "cash flow falling" };
}

function ChangeBadge({ badge }: { badge: NonNullable<Metric["badge"]> }) {
  const Icon = badge.tone === "up" ? TrendingUp : badge.tone === "down" ? TrendingDown : null;
  const variant = badge.tone === "up" ? "success" : badge.tone === "down" ? "destructive" : "info";
  return (
    <Badge variant={badge.tone === "flat" ? "info" : variant} className="max-w-full truncate">
      {Icon ? <Icon size={12} aria-hidden /> : null}
      <span className="tabular-nums">{badge.label}</span>
      <span aria-hidden className="sr-only">
        {badge.text}
      </span>
    </Badge>
  );
}
