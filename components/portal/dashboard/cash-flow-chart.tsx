"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactMoney, formatMoney } from "@/lib/dashboard-format";

export type FlowRow = {
  label: string;
  revenue: number;
  expenses: number;
  payroll: number;
};

const CASH_FLOW_CONFIG = {
  revenue: { label: "Fee inflows", color: "var(--foreground)" },
  expenses: { label: "Operational outflows", color: "#f59e0b" },
  payroll: { label: "Teacher payouts", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function CashFlowChart({
  data,
  currency,
  loading,
  monthCount,
}: {
  data: FlowRow[];
  currency: string;
  loading: boolean;
  monthCount: number;
}) {
  const hasData = data.some((row) => row.revenue || row.expenses || row.payroll);

  return (
    <Card className="gap-0 lg:col-span-2">
      <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-lg bg-foreground/[0.04] ring-1 ring-border"
          >
            <Wallet size={14} className="text-foreground" />
          </span>
          Cash flow & financial trends
        </CardTitle>
        <CardDescription>
          {loading
            ? "Building the monthly ledger series..."
            : `Monthly fee inflows against teacher payouts and operational outflows across the last ${monthCount} months.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : hasData ? (
          <ChartContainer config={CASH_FLOW_CONFIG} className="h-[300px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 8, top: 12 }}>
              <defs>
                <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dashExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="dashPayroll" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatMoney(Number(value), currency)} />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area dataKey="revenue" type="monotone" stroke="var(--foreground)" strokeWidth={2} fill="url(#dashRevenue)" />
              <Area dataKey="payroll" type="monotone" stroke="var(--muted-foreground)" strokeWidth={2} fill="url(#dashPayroll)" />
              <Area dataKey="expenses" type="monotone" stroke="#f59e0b" strokeWidth={2} fill="url(#dashExpenses)" />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No cash flow activity yet"
            description="Once payments, expenses, or payouts are recorded, the monthly trend appears here."
          />
        )}
      </CardContent>
    </Card>
  );
}
