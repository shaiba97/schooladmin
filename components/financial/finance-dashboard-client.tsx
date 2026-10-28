"use client";

import * as React from "react";
import Link from "next/link";
import {
  CircleCheck,
  CirclePlus,
  Loader2,
  RefreshCw,
  ReceiptText,
  School,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  getFinanceDashboard,
  listFinanceExpenses,
  listFinancePayments,
  type ApiFinanceExpense,
  type ApiFinancePayment,
  type FinanceDashboardActivity,
  type FinanceDashboardStats,
} from "@/lib/api/finance";
import { listFinancePayouts, type ApiPayout } from "@/lib/api/payroll";
import { academicErrorMessage } from "@/lib/format";

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const currencyFormatters = new Map<string, Intl.NumberFormat>();

const CASH_FLOW_CONFIG = {
  revenue: { label: "Fee revenue", color: "#10b981" },
  expenses: { label: "Expenses", color: "#f59e0b" },
  payroll: { label: "Teacher payouts", color: "#0d9488" },
} satisfies ChartConfig;

const COLLECTION_CONFIG = {
  amount: { label: "Collected", color: "#14b8a6" },
} satisfies ChartConfig;

const DONUT_PALETTE = [
  "#0f766e",
  "#14b8a6",
  "#10b981",
  "#059669",
  "#34d399",
  "#2dd4bf",
  "#99f6e4",
  "#0d9488",
  "#a7f3d0",
  "#f59e0b",
];

const QUICK_ACTIONS = [
  {
    href: "/school/admin/finance/payments",
    label: "Record Payment",
    icon: CirclePlus,
  },
  {
    href: "/school/admin/finance/expenses",
    label: "Approve Expenses",
    icon: ReceiptText,
  },
  {
    href: "/school/admin/finance/payouts",
    label: "View Payouts",
    icon: Wallet,
  },
];

const ACTIVITY_TYPE_META: Record<string, { label: string; variant: BadgeVariant }> = {
  collection: { label: "Payment", variant: "success" },
  expense: { label: "Expense", variant: "warning" },
  payroll: { label: "Payroll", variant: "info" },
};

function formatMoney(value: number, currency: string) {
  const amount = Number.isFinite(value) ? value : 0;
  let code = (currency || "SDG").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) code = "SDG";

  let formatter = currencyFormatters.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      formatter = new Intl.NumberFormat("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatters.set(code, formatter);
  }

  return formatter.format(amount);
}

function formatCompactMoney(value: number, currency: string) {
  const amount = Number.isFinite(value) ? value : 0;
  let code = (currency || "SDG").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) code = "SDG";

  let formatter = currencyFormatters.get(`compact:${code}`);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        notation: "compact",
        maximumFractionDigits: 1,
      } as Intl.NumberFormatOptions);
    } catch {
      formatter = new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
    }
    currencyFormatters.set(`compact:${code}`, formatter);
  }

  return formatter.format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

function monthKeyOf(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1) + index, 1),
    );
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: MONTH_YEAR_FORMATTER.format(date),
    };
  });
}

function isCompletedPayment(payment: ApiFinancePayment) {
  return String(payment.statusLabel ?? payment.paymentStatus ?? "").toLowerCase() === "completed";
}

function pickPrimaryCurrency(
  payments: ApiFinancePayment[],
  expenses: ApiFinanceExpense[],
  payouts: ApiPayout[],
) {
  const counts = new Map<string, number>();
  for (const [code] of [
    ...payments.map((row) => [row.currencyCode] as const),
    ...expenses.map((row) => [row.currencyCode] as const),
    ...payouts.map((row) => [row.currencyCode] as const),
  ]) {
    const normalized = String(code ?? "").toUpperCase();
    if (/^[A-Z]{3}$/.test(normalized)) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SDG";
}

function growthBadge(pct: number | null) {
  if (pct === null) {
    return <Badge variant="muted">No prior month data</Badge>;
  }
  if (pct >= 0) {
    return (
      <Badge variant="success">
        <TrendingUp size={12} aria-hidden />+{pct.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <TrendingDown size={12} aria-hidden />
      {pct.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%
    </Badge>
  );
}

export function FinanceDashboardClient({
  initialStats,
  initialPayments,
  initialExpenses,
  initialPayouts,
  initialError,
}: {
  initialStats: FinanceDashboardStats | null;
  initialPayments: ApiFinancePayment[];
  initialExpenses: ApiFinanceExpense[];
  initialPayouts: ApiPayout[];
  initialError: string;
}) {
  const [stats, setStats] = React.useState(initialStats);
  const [payments, setPayments] = React.useState(initialPayments);
  const [expenses, setExpenses] = React.useState(initialExpenses);
  const [payouts, setPayouts] = React.useState(initialPayouts);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState("");

  const currency = React.useMemo(
    () => pickPrimaryCurrency(payments, expenses, payouts),
    [payments, expenses, payouts],
  );

  const completedPayments = React.useMemo(
    () => payments.filter(isCompletedPayment),
    [payments],
  );

  const revenueByMonth = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of completedPayments) {
      const key = monthKeyOf(payment.paidAt);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + payment.amount);
    }
    return map;
  }, [completedPayments]);

  const monthGrowth = React.useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
    const current = revenueByMonth.get(currentKey) ?? 0;
    const prior = revenueByMonth.get(previousKey) ?? 0;
    const pct =
      prior > 0 ? Math.round(((current - prior) / prior) * 1000) / 10 : current > 0 ? 100 : null;
    return { current, prior, pct };
  }, [revenueByMonth]);

  const flowData = React.useMemo(() => {
    const months = lastMonthBuckets(6);
    const expenseByMonth = new Map<string, number>();
    for (const expense of expenses) {
      const normalized = expense.status?.toLowerCase();
      if (normalized !== "approved" && normalized !== "paid") continue;
      const key = monthKeyOf(expense.incurredAt);
      if (!key) continue;
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + expense.amount);
    }
    const payrollByMonth = new Map<string, number>();
    for (const payout of payouts) {
      if (payout.status?.toLowerCase() !== "paid") continue;
      const key = monthKeyOf(payout.paidAt);
      if (!key) continue;
      payrollByMonth.set(key, (payrollByMonth.get(key) ?? 0) + payout.netAmount);
    }
    return months.map((bucket) => ({
      label: bucket.label,
      revenue: Math.round((revenueByMonth.get(bucket.key) ?? 0) * 100) / 100,
      expenses: Math.round((expenseByMonth.get(bucket.key) ?? 0) * 100) / 100,
      payroll: Math.round((payrollByMonth.get(bucket.key) ?? 0) * 100) / 100,
    }));
  }, [expenses, payouts, revenueByMonth]);

  const collectionData = React.useMemo(() => {
    const buckets: { label: string; amount: number }[] = [];
    const byKind = new Map<string, number>();
    const installments = new Map<number, number>();
    for (const payment of completedPayments) {
      const kind = payment.allocationKind;
      if (kind === "installment" && payment.installmentNo != null) {
        installments.set(
          payment.installmentNo,
          (installments.get(payment.installmentNo) ?? 0) + payment.amount,
        );
      } else {
        byKind.set(kind, (byKind.get(kind) ?? 0) + payment.amount);
      }
    }
    for (const [kind, keyLabel] of [
      ["registration", "Registration"],
      ["lump_sum", "Full-year lump sum"],
      ["transport", "Transport"],
    ] as const) {
      const amount = byKind.get(kind);
      if (amount) buckets.push({ label: keyLabel, amount: Math.round(amount * 100) / 100 });
    }
    const installmentKeys = [...installments.keys()].sort((a, b) => a - b);
    for (const key of installmentKeys) {
      buckets.push({
        label: `Installment ${key}`,
        amount: Math.round((installments.get(key) ?? 0) * 100) / 100,
      });
    }
    return buckets;
  }, [completedPayments]);

  const expenseDonutData = React.useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const expense of expenses) {
      const normalized = expense.status?.toLowerCase();
      if (normalized !== "approved" && normalized !== "paid") continue;
      const name = expense.categoryName || "Uncategorized";
      byCategory.set(name, (byCategory.get(name) ?? 0) + expense.amount);
    }
    return [...byCategory.entries()]
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const donutConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    expenseDonutData.forEach((slice, index) => {
      config[slice.name] = {
        label: slice.name,
        color: DONUT_PALETTE[index % DONUT_PALETTE.length],
      };
    });
    return config;
  }, [expenseDonutData]);

  const activity = stats?.recentActivity ?? [];

  function clearAll() {
    setStats(null);
    setPayments([]);
    setExpenses([]);
    setPayouts([]);
  }

  async function refreshDashboard() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const [nextStats, nextPayments, nextExpenses, nextPayouts] = await Promise.all([
        getFinanceDashboard().catch(() => null),
        listFinancePayments().catch(() => null),
        listFinanceExpenses().catch(() => null),
        listFinancePayouts().catch(() => null),
      ]);
      const failures: string[] = [];
      if (!nextStats) failures.push("dashboard stats");
      if (!nextPayments) failures.push("payments");
      if (!nextExpenses) failures.push("expenses");
      if (!nextPayouts) failures.push("payouts");

      clearAll();
      if (nextStats) setStats(nextStats);
      if (nextPayments) setPayments(nextPayments);
      if (nextExpenses) setExpenses(nextExpenses);
      if (nextPayouts) setPayouts(nextPayouts);

      if (failures.length > 0) {
        throw new Error(`Unable to refresh ${failures.join(", ")}`);
      }
    } catch (cause) {
      setRefreshError(
        cause instanceof Error && cause.message.startsWith("Unable to refresh")
          ? cause.message
          : academicErrorMessage(cause, "Unable to refresh financial dashboard"),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const statusBar = initialError || refreshError ? (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <span>{refreshError || initialError}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => void refreshDashboard()} disabled={refreshing}>
        Retry
      </Button>
    </div>
  ) : null;

  const showSkeletons = refreshing || (!stats && !initialError);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin / Financial Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Wallet size={20} className="text-primary" aria-hidden /> Financial Dashboard
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <School size={14} aria-hidden />
            <span>
              {stats?.tenant.name ? `Financial overview for ${stats.tenant.name}` : "Live tenant financial overview"}
            </span>
            {stats ? (
              <span aria-hidden>·</span>
            ) : null}
            {stats ? (
              <span className="tabular-nums">
                {stats.totalStudents} active students · {stats.totalTeachers} active teachers
              </span>
            ) : null}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshDashboard()} disabled={refreshing}>
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={14} aria-hidden />
          )}
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {statusBar}

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={buttonVariants({ variant: "outline" })}
          >
            <action.icon size={14} aria-hidden />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showSkeletons && !stats ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card p-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-3 h-8 w-40" />
              <Skeleton className="mt-3 h-2.5 w-44" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              label="Total fee revenue collected"
              value={formatMoney(stats?.totalCollected ?? 0, currency)}
              badge={growthBadge(monthGrowth.pct)}
              caption={`This month ${formatMoney(monthGrowth.current, currency)} · Last month ${formatMoney(monthGrowth.prior, currency)}`}
            />
            <MetricCard
              label="Outstanding fee balance"
              value={
                stats?.outstandingFeeBalance != null
                  ? formatMoney(stats.outstandingFeeBalance, currency)
                  : "-"
              }
              caption={
                stats?.outstandingFeeBalance != null
                  ? `${stats.totalStudents} active student accounts`
                  : "Unavailable right now"
              }
            />
            <MetricCard
              label="Operational expenses"
              value={formatMoney(stats?.expenses ?? 0, currency)}
              caption={stats ? `Teacher payroll ${formatMoney(stats.payroll, currency)}` : "Approved and paid expenses"}
            />
            <MetricCard
              label="Net operating balance"
              value={formatMoney(stats?.netCashFlow ?? 0, currency)}
              valueClassName={
                (stats?.netCashFlow ?? 0) >= 0 ? "text-success" : "text-destructive"
              }
              caption={stats ? `Revenue ${formatMoney(stats.totalCollected, currency)} − outflows ${formatMoney(stats.outflows, currency)}` : "Revenue minus expenses and payroll"}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Cash flow trend</CardTitle>
            <CardDescription>
              Monthly fee revenue against expenses and teacher payouts over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {showSkeletons && payments.length === 0 ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer config={CASH_FLOW_CONFIG} className="h-[300px] w-full">
                <AreaChart data={flowData} margin={{ left: 4, right: 8, top: 12 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillPayroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) =>
                      formatCompactMoney(value, currency)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatMoney(Number(value), currency)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="revenue"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#fillRevenue)"
                  />
                  <Area
                    dataKey="expenses"
                    type="monotone"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#fillExpenses)"
                  />
                  <Area
                    dataKey="payroll"
                    type="monotone"
                    stroke="#0d9488"
                    strokeWidth={2}
                    fill="url(#fillPayroll)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>Spending distribution across categories.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {showSkeletons && expenses.length === 0 ? (
              <Skeleton className="mx-auto h-[300px] w-[280px] rounded-full" />
            ) : expenseDonutData.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={ReceiptText}
                  title="No approved expenses yet"
                  description="Category distribution appears once expenses are approved or paid."
                />
              </div>
            ) : (
              <>
                <ChartContainer config={donutConfig} className="mx-auto h-[300px] w-full max-w-[320px]">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value) => formatMoney(Number(value), currency)}
                        />
                      }
                    />
                    <Pie
                      data={expenseDonutData}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={100}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {expenseDonutData.map((slice, index) => (
                        <Cell
                          key={slice.name}
                          fill={DONUT_PALETTE[index % DONUT_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {expenseDonutData.slice(0, 4).map((slice, index) => (
                    <Badge key={slice.name} variant="outline" className="items-center">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
                      />
                      {slice.name}
                    </Badge>
                  ))}
                  {expenseDonutData.length > 4 ? (
                    <Badge variant="muted">+{expenseDonutData.length - 4} more</Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>Fee collection breakdown</CardTitle>
            <CardDescription>
              Where completed collections landed: registration, lump sums, and installments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {showSkeletons && payments.length === 0 ? (
              <Skeleton className="h-[280px] w-full" />
            ) : collectionData.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={ReceiptText}
                  title="No completed collections yet"
                  description="Cumulative student payments will appear here once recorded."
                />
              </div>
            ) : (
              <ChartContainer config={COLLECTION_CONFIG} className="h-[280px] w-full">
                <BarChart data={collectionData} margin={{ left: 4, right: 8, top: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-30}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) =>
                      formatCompactMoney(value, currency)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatMoney(Number(value), currency)}
                      />
                    }
                  />
                  <Bar dataKey="amount" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Recent ledger activity</CardTitle>
                <CardDescription>
                  Latest payments, expenses, and payroll across the tenant.
                </CardDescription>
              </div>
              <Badge variant="muted" className="tabular-nums">
                {activity.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {showSkeletons && !stats ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-3 w-9/12" />
                <Skeleton className="h-3 w-10/12" />
                <Skeleton className="h-3 w-8/12" />
              </div>
            ) : activity.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={CircleCheck}
                  title="No recent activity"
                  description="Financial events will stream in here as they happen."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Type
                      </th>
                      <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Details
                      </th>
                      <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Date
                      </th>
                      <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.slice(0, 10).map((entry, index) => (
                      <ActivityRow
                        key={`${entry.type}-${entry.at ?? index}-${index}`}
                        entry={entry}
                        currency={currency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t text-xs text-muted-foreground">
            Newest events first
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  badge,
  caption,
  valueClassName,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  caption: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {badge}
      </div>
      <p
        className={`mt-1.5 break-words text-2xl font-semibold tabular-nums ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{caption}</p>
    </div>
  );
}

function ActivityRow({ entry, currency }: { entry: FinanceDashboardActivity; currency: string }) {
  const meta = ACTIVITY_TYPE_META[entry.type?.toLowerCase()] ?? {
    label: entry.type || "Event",
    variant: "muted" as BadgeVariant,
  };
  const amount = entry.amount;
  const positive = amount >= 0;

  return (
    <tr className="border-b transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-2.5 align-middle">
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </td>
      <td className="max-w-[240px] px-3 py-2.5 align-middle">
        <span className="block truncate font-medium" title={entry.title}>
          {entry.title || "-"}
        </span>
        <span className="block truncate text-xs text-muted-foreground" title={entry.method}>
          {entry.method && entry.method !== "-" ? `Method: ${entry.method}` : "-"}
        </span>
      </td>
      <td className="px-3 py-2.5 align-middle whitespace-nowrap text-muted-foreground">
        {formatDateTime(entry.at)}
      </td>
      <td
        className={`px-4 py-2.5 text-right align-middle font-semibold tabular-nums ${
          positive ? "text-success" : "text-destructive"
        }`}
      >
        {positive ? "+" : "-"}
        {formatMoney(Math.abs(amount), currency)}
      </td>
    </tr>
  );
}
