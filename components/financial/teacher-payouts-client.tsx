"use client";

import * as React from "react";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  GraduationCap,
  Hash,
  Loader2,
  Mail,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  listFinancePayouts,
  payoutPayslipUrl,
  type ApiPayout,
} from "@/lib/api/payroll";
import { academicErrorMessage } from "@/lib/format";

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
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

type StatusMeta = {
  label: string;
  variant: BadgeVariant;
};

const STATUS_META: Record<string, StatusMeta> = {
  paid: { label: "Confirmed", variant: "success" },
  approved: { label: "Pending", variant: "warning" },
  draft: { label: "Pending", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  processing: { label: "Processing", variant: "info" },
};

function statusMeta(status: string): StatusMeta {
  return STATUS_META[status?.toLowerCase()] ?? { label: "Processing", variant: "info" };
}

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

function formatPeriod(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return MONTH_YEAR_FORMATTER.format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

function departmentOf(payout: ApiPayout) {
  return payout.departmentName || payout.positionTitle || "Unassigned";
}

function subjectOf(payout: ApiPayout) {
  return payout.staffSubject || payout.positionTitle || "-";
}

function labelForDeduction(deduction: ApiPayout["deductions"][number]) {
  const amount = formatMoney(deduction.amount, "");
  return deduction.note ? `${deduction.label} (${deduction.note}): ${amount}` : `${deduction.label}: ${amount}`;
}

export function TeacherPayoutsClient({
  initialPayouts,
  initialError,
}: {
  initialPayouts: ApiPayout[];
  initialError: string;
}) {
  const [payouts, setPayouts] = React.useState(initialPayouts);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [payPeriod, setPayPeriod] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [downloadingPayslipId, setDownloadingPayslipId] = React.useState<string | null>(null);
  const [payslipError, setPayslipError] = React.useState("");

  const periodOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const payout of payouts) {
      map.set(payout.periodStart, formatPeriod(payout.periodStart));
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [payouts]);

  const departmentOptions = React.useMemo(
    () => [...new Set(payouts.map(departmentOf))].sort((a, b) => a.localeCompare(b)),
    [payouts],
  );

  const selected = selectedUserId
    ? payouts.find((payout) => payout.userId === selectedUserId) ?? null
    : null;
  const history = selected
    ? payouts
        .filter((payout) => payout.userId === selected.userId)
        .sort(
          (a, b) =>
            a.periodStart.localeCompare(b.periodStart) ||
            a.createdAt.localeCompare(b.createdAt),
        )
    : [];

  const filtersActive = Boolean(
    query.trim() || payPeriod !== "all" || department !== "all",
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payouts.filter((payout) => {
      if (payPeriod !== "all" && payout.periodStart !== payPeriod) return false;
      if (department !== "all" && departmentOf(payout) !== department) return false;
      if (!needle) return true;
      return `${payout.staffName} ${payout.staffNumber} ${payout.payslipNo}`
        .toLowerCase()
        .includes(needle);
    });
  }, [payouts, query, payPeriod, department]);

  function clearFilters() {
    setQuery("");
    setPayPeriod("all");
    setDepartment("all");
  }

  async function refreshPayouts() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const next = await listFinancePayouts();
      setPayouts(next);
    } catch (cause) {
      setRefreshError(academicErrorMessage(cause, "Unable to load teacher payouts"));
    } finally {
      setRefreshing(false);
    }
  }

  async function downloadPayslip(payoutId: string, fallbackFilename: string) {
    setDownloadingPayslipId(payoutId);
    setPayslipError("");
    try {
      const response = await fetch(payoutPayslipUrl(payoutId), {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Payslip download failed (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      link.download = filename || `${fallbackFilename}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (cause) {
      setPayslipError(academicErrorMessage(cause, "Unable to download payslip"));
    } finally {
      setDownloadingPayslipId(null);
    }
  }

  const lifetimePaid = history.filter((payout) => payout.status === "paid");
  const lifetimeNetTotal = lifetimePaid.reduce(
    (sum, payout) => sum + payout.netAmount,
    0,
  );
  const averageMonthlyNet =
    lifetimePaid.length > 0 ? lifetimeNetTotal / lifetimePaid.length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin / Financial Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ReceiptText size={20} className="text-primary" aria-hidden /> Teacher Payouts
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monthly payouts with itemized deductions, personal salary history, and downloadable
            payslips.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshPayouts()}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={14} aria-hidden />
          )}
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {initialError || refreshError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{refreshError || initialError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPayouts()}
            disabled={refreshing}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Payout records
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{payouts.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible after filters
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{filtered.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confirmed payouts
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {payouts.filter((payout) => payout.status === "paid").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending payouts
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {payouts.filter(
              (payout) => payout.status === "draft" || payout.status === "approved",
            ).length}
          </p>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>All teacher payouts</CardTitle>
              <CardDescription>
                One row per monthly payout. Search by teacher name, employee ID, or payslip number.
              </CardDescription>
            </div>
            <Badge variant="muted" className="tabular-nums">
              {filtered.length} of {payouts.length}
            </Badge>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teacher, employee ID, or payslip"
                aria-label="Search payouts"
                className="ps-8"
              />
            </div>
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger aria-label="Filter by pay period" className="h-8">
                <SelectValue placeholder="All pay periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pay periods</SelectItem>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger aria-label="Filter by department" className="h-8">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              disabled={!filtersActive}
              className="justify-self-start lg:justify-self-auto"
            >
              Clear filters
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0" aria-busy={refreshing}>
          {payouts.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ReceiptText}
                title="No teacher payouts yet"
                description="Monthly salary payouts will appear here once they are recorded."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="No payouts match these filters"
                description="Try a different teacher, pay period, or department."
                action={{ label: "Clear filters", onClick: clearFilters }}
              />
            </div>
          ) : (
            <div className={refreshing ? "pointer-events-none opacity-60" : undefined}>
              <table className="w-full min-w-[1120px] caption-bottom text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Teacher &amp; employee ID
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Department / subject
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Pay period
                    </th>
                    <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Base &amp; deductions
                    </th>
                    <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Net amount
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Payout date
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payout) => {
                    const meta = statusMeta(payout.status);
                    return (
                      <tr
                        key={payout.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(payout.userId)}
                            className="group max-w-[260px] text-left"
                          >
                            <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                              {payout.staffName || "Unknown staff member"}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Hash size={11} aria-hidden />
                                {payout.staffNumber || "No employee ID"}
                              </span>
                              <span aria-hidden>-</span>
                              <span className="truncate">{payout.payslipNo}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="block font-medium">{departmentOf(payout)}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {subjectOf(payout)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <CalendarDays size={13} aria-hidden />
                            <span className="font-medium">{formatPeriod(payout.periodStart)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right align-middle">
                          <span className="block font-medium tabular-nums">
                            {formatMoney(payout.grossAmount, payout.currencyCode)}
                          </span>
                          <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                            Deductions {formatMoney(payout.totalDeductions, payout.currencyCode)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums text-success">
                          {formatMoney(payout.netAmount, payout.currencyCode)}
                        </td>
                        <td className="px-3 py-3 align-middle text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Clock size={13} aria-hidden />
                            {formatDateTime(payout.paidAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => setSelectedUserId(payout.userId)}
                          >
                            <UserRound size={13} aria-hidden />
                            View details &amp; history
                            <ChevronRight size={13} aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t text-xs text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{payouts.length}</span> payouts
          </span>
          <span>Newest payout first</span>
        </CardFooter>
      </Card>

      <Sheet
        open={Boolean(selectedUserId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedUserId(null);
            setPayslipError("");
          }
        }}
      >
        <SheetContent className="w-full gap-0 p-0 sm:max-w-4xl">
          <SheetHeader className="border-b p-5 pe-12">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider">
              Teacher payout record
            </SheetDescription>
            <SheetTitle className="text-lg">{selected?.staffName || "Teacher"}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Professional details and complete monthly payout history.
            </p>
          </SheetHeader>

          {selected ? (
            <div key={selected.userId} className="min-h-0 flex-1 overflow-y-auto p-5">
              <section
                aria-label="Teacher professional details"
                className="grid overflow-hidden rounded-xl border"
              >
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{selected.positionTitle || "Staff"}</Badge>
                    <Badge variant="muted">{statusMeta(selected.status).label}</Badge>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 p-4">
                    <Detail
                      icon={UserRound}
                      label="Full name"
                      value={selected.staffName || "-"}
                    />
                    <Detail
                      icon={Hash}
                      label="Employee ID"
                      value={selected.staffNumber || "-"}
                    />
                    <Detail
                      icon={Briefcase}
                      label="Department"
                      value={departmentOf(selected)}
                    />
                    <Detail
                      icon={GraduationCap}
                      label="Subject"
                      value={subjectOf(selected)}
                    />
                  </div>
                  <div className="space-y-3 border-t p-4 md:border-s md:border-t-0">
                    <Detail icon={Mail} label="Email" value={selected.staffEmail || "-"} />
                    <Detail icon={Phone} label="Phone" value={selected.staffPhone || "-"} />
                    <Detail
                      icon={Wallet}
                      label="Contract base salary"
                      value={formatMoney(selected.grossAmount, selected.currencyCode)}
                    />
                    <Detail
                      icon={ReceiptText}
                      label="Payslip number"
                      value={selected.payslipNo}
                    />
                  </div>
                </div>
              </section>

              <section
                aria-label="Lifetime payout history"
                className="mt-5 rounded-xl border bg-card"
              >
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">Lifetime payout history</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Every recorded monthly payout, from the first to the latest.
                      </p>
                    </div>
                  </div>
                  {payslipError ? (
                    <p
                      role="alert"
                      className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      {payslipError}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 border-b p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total lifetime paid
                    </p>
                    <p className="mt-1 break-words text-base font-semibold leading-tight tabular-nums md:text-lg">
                      {formatMoney(lifetimeNetTotal, selected.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Average monthly net
                    </p>
                    <p className="mt-1 break-words text-base font-semibold leading-tight tabular-nums md:text-lg">
                      {formatMoney(averageMonthlyNet, selected.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Paid months
                    </p>
                    <p className="mt-1 text-base font-semibold leading-tight tabular-nums md:text-lg">
                      {lifetimePaid.length} of {history.length}
                    </p>
                  </div>
                </div>
                {history.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={ReceiptText}
                      title="No payout history"
                      description="This teacher does not have any recorded salary payouts yet."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b">
                          <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Pay period
                          </th>
                          <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Base salary
                          </th>
                          <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Itemized deductions
                          </th>
                          <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Net amount
                          </th>
                          <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Payout date
                          </th>
                          <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Status
                          </th>
                          <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Payslip
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((record) => {
                          const meta = statusMeta(record.status);
                          return (
                            <tr key={record.id} className="border-b last:border-0">
                              <td className="px-3 py-2.5 align-middle font-medium">
                                {formatPeriod(record.periodStart)}
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle font-semibold tabular-nums">
                                {formatMoney(record.grossAmount, record.currencyCode)}
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <div
                                  className="max-w-[220px] text-xs leading-relaxed"
                                  title={
                                    record.deductions.length > 0
                                      ? record.deductions.map(labelForDeduction).join("\n")
                                      : "No deductions"
                                  }
                                >
                                  {record.deductions.length === 0 ? (
                                    <span className="text-muted-foreground">None</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {record.deductions.slice(0, 2).map((deduction) => (
                                        <Badge
                                          key={deduction.id}
                                          variant="outline"
                                          className="tabular-nums"
                                          title={labelForDeduction(deduction)}
                                        >
                                          {deduction.label}
                                        </Badge>
                                      ))}
                                      {record.deductions.length > 2 ? (
                                        <Badge variant="muted" className="tabular-nums">
                                          +
                                          {record.deductions.length - 2}
                                          more
                                        </Badge>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle font-semibold tabular-nums text-success">
                                {formatMoney(record.netAmount, record.currencyCode)}
                              </td>
                              <td className="px-3 py-2.5 align-middle whitespace-nowrap text-muted-foreground">
                                {record.status === "paid"
                                  ? formatDateTime(record.paidAt)
                                  : "-"}
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() =>
                                    void downloadPayslip(record.id, record.payslipNo)
                                  }
                                  disabled={downloadingPayslipId === record.id}
                                  aria-label={`Download payslip ${record.payslipNo}`}
                                >
                                  {downloadingPayslipId === record.id ? (
                                    <Loader2 size={13} className="animate-spin" aria-hidden />
                                  ) : (
                                    <Download size={13} aria-hidden />
                                  )}
                                  Download
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4 text-xs text-muted-foreground">
                  <span>
                    Total lifetime earnings paid:
                    <span className="ms-1 font-medium text-foreground">
                      {formatMoney(lifetimeNetTotal, selected.currencyCode)}
                    </span>
                  </span>
                  <span>
                    Average monthly net payout:
                    <span className="ms-1 font-medium text-foreground">
                      {formatMoney(averageMonthlyNet, selected.currencyCode)}
                    </span>
                  </span>
                </div>
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 flex items-start gap-1.5 text-sm">
        <Icon size={14} className="mt-0.5 text-muted-foreground" aria-hidden />
        <span className="min-w-0 break-words">{value}</span>
      </p>
    </div>
  );
}
