"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileSpreadsheet,
  Printer,
  School,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MetricCards } from "@/components/portal/dashboard/metric-cards";
import { CashFlowChart, type FlowRow } from "@/components/portal/dashboard/cash-flow-chart";
import { EnrollmentDistributionChart, type EnrollmentSlice } from "@/components/portal/dashboard/enrollment-distribution-chart";
import { ActivityLedger } from "@/components/portal/dashboard/activity-ledger";
import { ShortcutCards } from "@/components/portal/dashboard/shortcut-cards";
import { useLiveClock } from "@/components/portal/dashboard/use-live-clock";
import {
  getFinanceDashboard,
  listFinanceExpenses,
  listFinancePayments,
  type ApiFinanceExpense,
  type ApiFinancePayment,
  type FinanceDashboardStats,
} from "@/lib/api/finance";
import { listFinancePayouts, type ApiPayout } from "@/lib/api/payroll";
import { listStaff } from "@/lib/api/staff";
import { listStudents } from "@/lib/api/students";
import { currentEnrollment } from "@/lib/api/mappers";
import type { ApiPaginated, ApiStaffDirectoryMember, ApiStudent } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";
import {
  buildActivityCsv,
  dashboardExportFilename,
  downloadCsv,
  printDashboard,
} from "@/lib/dashboard-export";
import {
  formatMoney,
  lastMonthBuckets,
  monthKeyOf,
  pickPrimaryCurrency,
} from "@/lib/dashboard-format";

const MONTH_COUNT = 9;

const CLOCK_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function greetingFor(now: Date | null) {
  if (!now) return "Welcome back";
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function completedPayment(payment: ApiFinancePayment) {
  return String(payment.statusLabel ?? payment.paymentStatus ?? "").toLowerCase() === "completed";
}

export function AdminDashboardClient({
  initialStats,
  initialPayments,
  initialExpenses,
  initialPayouts,
  initialStudents,
  initialStaff,
  initialError,
}: {
  initialStats: FinanceDashboardStats | null;
  initialPayments: ApiFinancePayment[];
  initialExpenses: ApiFinanceExpense[];
  initialPayouts: ApiPayout[];
  initialStudents: ApiPaginated<ApiStudent> | null;
  initialStaff: ApiStaffDirectoryMember[];
  initialError: string;
}) {
  const [stats, setStats] = useState(initialStats);
  const [payments, setPayments] = useState(initialPayments);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [students, setStudents] = useState(initialStudents);
  const [staff, setStaff] = useState(initialStaff);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const now = useLiveClock();

  const currency = useMemo(
    () => pickPrimaryCurrency(payments, expenses, payouts),
    [payments, expenses, payouts],
  );

  const flowData = useMemo<FlowRow[]>(() => {
    const buckets = lastMonthBuckets(MONTH_COUNT);
    const revenueByMonth = new Map<string, number>();
    for (const payment of payments.filter(completedPayment)) {
      const key = monthKeyOf(payment.paidAt);
      if (!key) continue;
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + payment.amount);
    }
    const expensesByMonth = new Map<string, number>();
    for (const expense of expenses) {
      const status = expense.status?.toLowerCase();
      if (status !== "approved" && status !== "paid") continue;
      const key = monthKeyOf(expense.incurredAt);
      if (!key) continue;
      expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + expense.amount);
    }
    const payrollByMonth = new Map<string, number>();
    for (const payout of payouts) {
      if (payout.status?.toLowerCase() !== "paid") continue;
      const key = monthKeyOf(payout.paidAt);
      if (!key) continue;
      payrollByMonth.set(key, (payrollByMonth.get(key) ?? 0) + payout.netAmount);
    }
    return buckets.map((bucket) => ({
      label: bucket.label,
      revenue: Math.round(revenueByMonth.get(bucket.key) ?? 0),
      expenses: Math.round(expensesByMonth.get(bucket.key) ?? 0),
      payroll: Math.round(payrollByMonth.get(bucket.key) ?? 0),
    }));
  }, [payments, expenses, payouts]);

  const enrollmentSlices = useMemo<EnrollmentSlice[]>(() => {
    if (!students) return [];
    const counts = new Map<string, number>();
    for (const student of students.data) {
      const level =
        currentEnrollment(student)?.schoolClass?.educationLevel ||
        student.educationLevel ||
        "Unassigned";
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [students]);

  const monthGrowth = useMemo(() => {
    if (!stats) return { current: 0, prior: 0, pct: null };
    if (stats.collectionsChangePct != null) {
      const buckets = lastMonthBuckets(2);
      const keyIndex = flowData.findIndex((row) => row.label === buckets[1].label);
      return {
        current: keyIndex >= 0 ? flowData[keyIndex].revenue : 0,
        prior: stats.collectionsLastMonth,
        pct: stats.collectionsChangePct,
      };
    }
    const current = flowData[flowData.length - 1]?.revenue ?? 0;
    const prior = flowData[flowData.length - 2]?.revenue ?? 0;
    const pct = prior > 0 ? Math.round(((current - prior) / prior) * 1000) / 10 : null;
    return { current, prior, pct };
  }, [stats, flowData]);

  const flowGrowth = useMemo(() => {
    if (flowData.length < 2) return null;
    const current = flowData[flowData.length - 1];
    const prior = flowData[flowData.length - 2];
    const currentNet = current.revenue - current.expenses - current.payroll;
    const priorNet = prior.revenue - prior.expenses - prior.payroll;
    const pct =
      priorNet !== 0 ? Math.round(((currentNet - priorNet) / Math.abs(priorNet)) * 1000) / 10 : null;
    return { pct, currentNet, priorNet };
  }, [flowData]);

  const loading = (refreshing || (!stats && !initialError)) === true;

  async function refreshDashboard() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const [statsResult, paymentsResult, expensesResult, payoutsResult, studentsResult, staffResult] =
        await Promise.all([
          getFinanceDashboard()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
          listFinancePayments()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
          listFinanceExpenses()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
          listFinancePayouts()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
          listStudents()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
          listStaff()
            .then((value) => ({ ok: true as const, value }))
            .catch((cause) => ({ ok: false as const, cause })),
        ]);

      setStats(statsResult.ok ? statsResult.value : null);
      setPayments(paymentsResult.ok ? paymentsResult.value : []);
      setExpenses(expensesResult.ok ? expensesResult.value : []);
      setPayouts(payoutsResult.ok ? payoutsResult.value : []);
      setStudents(studentsResult.ok ? studentsResult.value : null);
      setStaff(staffResult.ok ? staffResult.value : []);
      const problems = [statsResult, paymentsResult, expensesResult, payoutsResult, studentsResult, staffResult]
        .filter((result) => !result.ok)
        .map((result) => academicErrorMessage(result.cause, "Unable to refresh dashboard"));
      if (problems.length > 0) setRefreshError(problems.join(" · "));
    } catch (cause) {
      setRefreshError(academicErrorMessage(cause, "Unable to refresh dashboard"));
    } finally {
      setRefreshing(false);
    }
  }

  function handleExport() {
    const csv = buildActivityCsv(stats, payments, expenses, payouts);
    downloadCsv(dashboardExportFilename("activity"), csv);
  }

  const errorBanner = initialError || refreshError ? (
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

  const staffOnDutyValue = stats ? `${stats.totalTeachers + staff.length}` : null;
  const levelsCount = new Set(enrollmentSlices.map((slice) => slice.name)).size;

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="dashboard-heading"
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-foreground/[0.03] via-card to-foreground/[0.02] p-5 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-foreground/[0.03] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-foreground/[0.02] blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <School size={12} aria-hidden />
                {stats?.tenant.name ?? "Madar School"}
              </Badge>
              <Badge variant="muted" className="gap-1.5">
                <Sparkles size={12} aria-hidden />
                Multi-tenant workspace
              </Badge>
            </div>
            <h1 id="dashboard-heading" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {greetingFor(now)},<span className="bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 bg-clip-text text-transparent dark:from-white dark:via-neutral-300 dark:to-neutral-500"> Admin</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {now ? (
                <span className="tabular-nums">{CLOCK_FORMATTER.format(now)}</span>
              ) : (
                <span suppressHydrationWarning>— live clock syncing —</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleExport}>
              <Download size={14} aria-hidden />
              Export Data
            </Button>
            <Button type="button" variant="outline" onClick={printDashboard}>
              <Printer size={14} aria-hidden />
              Generate Report
            </Button>
            <Link
              href="/school/admin/finance/dashboard"
              className={buttonVariants({ variant: "ghost" })}
              title="Detailed financial dashboard"
            >
              <FileSpreadsheet size={14} aria-hidden />
              Financial detail
            </Link>
          </div>
        </div>
      </section>

      {errorBanner}

      <MetricCards
        loading={loading}
        students={
          stats
            ? {
                value: stats.totalStudents.toLocaleString("en-GB"),
                caption: `across ${Math.max(levelsCount, 1)} education tier${levelsCount === 1 ? "" : "s"}`,
              }
            : null
        }
        staffOnDuty={
          staffOnDutyValue
            ? {
                value: staffOnDutyValue,
                caption: `${stats?.totalTeachers ?? 0} teaching · ${staff.length} administrative`,
              }
            : null
        }
        collections={
          stats
            ? {
                value: formatMoney(stats.totalCollected, currency),
                caption: monthGrowth.current
                  ? `this month ${formatMoney(monthGrowth.current, currency)} collected`
                  : "Mada, KNET, and bank transfers vs outstanding",
                pct: monthGrowth.pct,
              }
            : null
        }
        cashFlow={
          stats
            ? {
                value: formatMoney(stats.netCashFlow, currency),
                caption: `Revenue ${formatMoney(stats.totalCollected, currency)} − outflows ${formatMoney(stats.outflows, currency)}`,
                pct: flowGrowth?.pct ?? null,
                negative: stats.netCashFlow < 0,
              }
            : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CashFlowChart data={flowData} currency={currency} loading={loading} monthCount={MONTH_COUNT} />
        <EnrollmentDistributionChart
          slices={enrollmentSlices}
          total={students?.total ?? 0}
          loading={loading}
        />
        <ActivityLedger activity={stats?.recentActivity ?? []} currency={currency} loading={loading} />
        <ShortcutCards />
      </div>
    </div>
  );
}
