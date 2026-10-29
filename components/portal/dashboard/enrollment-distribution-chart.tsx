"use client";

import { Cell, Pie, PieChart } from "recharts";
import { PieChart as PieChartIcon, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const PALETTE = [
  "var(--dashboard-slice-1)",
  "var(--dashboard-slice-2)",
  "var(--dashboard-slice-3)",
  "var(--dashboard-slice-4)",
  "var(--dashboard-slice-5)",
  "var(--dashboard-slice-6)",
];

export type EnrollmentSlice = { name: string; count: number };

type PieEntry = { name: string; count: number };

function buildConfig(slices: PieEntry[]) {
  const config: Record<string, { label: string; color: string }> = {};
  slices.forEach((slice, index) => {
    config[slice.name] = { label: slice.name, color: PALETTE[index % PALETTE.length] };
  });
  return config satisfies ChartConfig;
}

export function EnrollmentDistributionChart({
  slices,
  total,
  loading,
}: {
  slices: EnrollmentSlice[];
  total: number;
  loading: boolean;
}) {
  const hasData = slices.length > 0 && total > 0;

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-lg bg-foreground/[0.04] ring-1 ring-border"
          >
            <Users size={14} className="text-foreground" />
          </span>
          Enrollment distribution
        </CardTitle>
        <CardDescription>Active students grouped by education tier.</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="mx-auto h-[280px] w-[260px] rounded-full" />
        ) : hasData ? (
          <>
            <ChartContainer config={buildConfig(slices)} className="mx-auto h-[260px] w-full max-w-[300px]">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => `${Number(value).toLocaleString("en-GB")} students`}
                    />
                  }
                />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={98}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {slices.slice(0, 4).map((slice, index) => (
                <Badge key={slice.name} variant="outline" className="items-center">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                  />
                  {slice.name}
                  <span className="tabular-nums text-muted-foreground">{slice.count}</span>
                </Badge>
              ))}
              {slices.length > 4 ? <Badge variant="muted">+{slices.length - 4} more</Badge> : null}
            </div>
          </>
        ) : (
          <EmptyState
            icon={PieChartIcon}
            title="No enrollment data yet"
            description="Tier distribution appears once students with active enrollments are recorded."
          />
        )}
      </CardContent>
    </Card>
  );
}
