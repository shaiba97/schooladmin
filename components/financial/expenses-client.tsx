"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  Link2,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  Store,
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
import { listFinanceExpenses, type ApiFinanceExpense } from "@/lib/api/finance";
import { academicErrorMessage } from "@/lib/format";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_RANGES = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
] as const;

type DateRange = (typeof DATE_RANGES)[number]["value"];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
] as const;

const currencyFormatters = new Map<string, Intl.NumberFormat>();

type StatusMeta = {
  label: string;
  variant: BadgeVariant;
};

const STATUS_META: Record<string, StatusMeta> = {
  paid: { label: "Paid", variant: "success" },
  approved: { label: "Approved", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function statusMeta(status: string): StatusMeta {
  return STATUS_META[status?.toLowerCase()] ?? {
    label: status ? "Unknown" : "Pending",
    variant: "muted",
  };
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMATTER.format(date);
}

function expenseDate(expense: ApiFinanceExpense) {
  const parsed = new Date(expense.incurredAt);
  if (Number.isNaN(parsed.getTime())) return null;

  const normalized = new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
  return normalized;
}

function matchesDateRange(expense: ApiFinanceExpense, range: DateRange) {
  if (range === "all") return true;
  const date = expenseDate(expense);
  if (!date) return true;

  const today = new Date();
  const startOfToday = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  if (range === "today") return date.getTime() === startOfToday.getTime();
  if (range === "7d")
    return date.getTime() >= startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d")
    return date.getTime() >= startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000;
  if (range === "month")
    return (
      date.getUTCFullYear() === today.getFullYear() &&
      date.getUTCMonth() === today.getMonth()
    );
  return date.getUTCFullYear() === today.getFullYear();
}

export function ExpensesClient({
  initialExpenses,
  initialError,
}: {
  initialExpenses: ApiFinanceExpense[];
  initialError: string;
}) {
  const [expenses, setExpenses] = React.useState(initialExpenses);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [selectedExpenseId, setSelectedExpenseId] = React.useState<string | null>(null);

  const categoryOptions = React.useMemo(
    () =>
      [...new Set(expenses.map((expense) => expense.categoryName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [expenses],
  );

  const selected = selectedExpenseId
    ? expenses.find((expense) => expense.id === selectedExpenseId) ?? null
    : null;

  const filtersActive =
    Boolean(query.trim()) ||
    category !== "all" ||
    status !== "all" ||
    dateRange !== "all";

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (category !== "all" && expense.categoryName !== category) return false;
      if (status !== "all" && expense.status?.toLowerCase() !== status) return false;
      if (!matchesDateRange(expense, dateRange)) return false;
      if (!needle) return true;
      return `${expense.title} ${expense.description} ${expense.vendor} ${expense.categoryName}`
        .toLowerCase()
        .includes(needle);
    });
  }, [expenses, query, category, status, dateRange]);

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidAmount = expenses
    .filter((expense) => expense.status?.toLowerCase() === "paid")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingCount = expenses.filter((expense) => {
    const normalized = expense.status?.toLowerCase();
    return normalized === "pending" || normalized === "approved";
  }).length;
  const visibleAmount = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const primaryCurrency = filtered[0]?.currencyCode ?? expenses[0]?.currencyCode ?? "SDG";

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setDateRange("all");
  }

  async function refreshExpenses() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const next = await listFinanceExpenses();
      setExpenses(next);
    } catch (cause) {
      setRefreshError(academicErrorMessage(cause, "Unable to load expenses"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin / Financial Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ReceiptText size={20} className="text-primary" aria-hidden /> Expenses
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every recorded expense with category, amount, status, and vendor details.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshExpenses()}
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
            onClick={() => void refreshExpenses()}
            disabled={refreshing}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expense records
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{expenses.length}</p>
        </div>
        <div className="min-w-0 rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total recorded
          </p>
          <p className="mt-1 break-words text-base font-semibold tabular-nums md:text-2xl md:leading-tight">
            {formatMoney(totalAmount, primaryCurrency)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Paid total
          </p>
          <p className="mt-1 break-words text-base font-semibold tabular-nums md:text-2xl md:leading-tight">
            {formatMoney(paidAmount, primaryCurrency)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending approval
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{pendingCount}</p>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>All expenses</CardTitle>
              <CardDescription>
                Search by title, vendor, or category and filter by status, category, or date.
              </CardDescription>
            </div>
            <Badge variant="muted" className="tabular-nums">
              {filtered.length} of {expenses.length}
            </Badge>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px_180px_170px_auto]">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, vendor, or category"
                aria-label="Search expenses"
                className="ps-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter by status" className="h-8">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter by category" className="h-8">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger aria-label="Filter by date range" className="h-8">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
          {expenses.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ReceiptText}
                title="No expenses yet"
                description="Recorded expenses will appear here once they are added."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="No expenses match these filters"
                description="Try a different search term, category, status, or date range."
                action={{ label: "Clear filters", onClick: clearFilters }}
              />
            </div>
          ) : (
            <div className={refreshing ? "pointer-events-none opacity-60" : undefined}>
              <table className="w-full min-w-[900px] caption-bottom text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Expense / vendor
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Category
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Amount
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
                  {filtered.map((expense) => {
                    const meta = statusMeta(expense.status);
                    return (
                      <tr
                        key={expense.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() => setSelectedExpenseId(expense.id)}
                            className="group max-w-[320px] text-left"
                          >
                            <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                              {expense.title || "Untitled expense"}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Store size={11} aria-hidden />
                              <span className="truncate">
                                {expense.vendor || "No vendor recorded"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant="outline">{expense.categoryName || "Uncategorized"}</Badge>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <CalendarDays size={13} aria-hidden />
                            {formatDate(expense.incurredAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums text-destructive">
                          {formatMoney(expense.amount, expense.currencyCode)}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => setSelectedExpenseId(expense.id)}
                          >
                            View details
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
            <span className="font-medium text-foreground">{expenses.length}</span> expenses
            {" - "}
            <span className="font-medium text-foreground">
              {formatMoney(visibleAmount, primaryCurrency)}
            </span>{" "}
            visible
          </span>
          <span>Newest expense first</span>
        </CardFooter>
      </Card>

      <Sheet
        open={Boolean(selectedExpenseId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedExpenseId(null);
        }}
      >
        <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b p-5 pe-12">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider">
              Expense record
            </SheetDescription>
            <SheetTitle className="text-lg">
              {selected?.title || "Untitled expense"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selected?.categoryName || "Uncategorized"} - recorded{" "}
              {formatDate(selected?.incurredAt)}
            </p>
          </SheetHeader>

          {selected ? (
            <div key={selected.id} className="min-h-0 flex-1 overflow-y-auto p-5">
              <section
                aria-label="Expense summary"
                className="grid overflow-hidden rounded-xl border"
              >
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="muted">{statusMeta(selected.status).label}</Badge>
                    <Badge variant="outline">{selected.categoryName || "Uncategorized"}</Badge>
                  </div>
                </div>
                <div className="grid gap-4 p-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Amount
                      </p>
                      <p className="mt-0.5 break-words text-xl font-semibold leading-tight tabular-nums">
                        {formatMoney(selected.amount, selected.currencyCode)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Date
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                        <CalendarDays size={14} className="text-muted-foreground" aria-hidden />
                        {formatDate(selected.incurredAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                        {statusMeta(selected.status).variant === "success" ? (
                          <CircleCheck size={14} className="text-muted-foreground" aria-hidden />
                        ) : (
                          <Clock size={14} className="text-muted-foreground" aria-hidden />
                        )}
                        {statusMeta(selected.status).label}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Vendor / payee
                    </p>
                    <p className="mt-0.5 flex items-start gap-1.5 text-sm">
                      <Store size={14} className="mt-0.5 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 break-words">
                        {selected.vendor || "No vendor recorded"}
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              <section
                aria-label="Expense description"
                className="mt-5 rounded-xl border bg-card"
              >
                <div className="border-b p-4">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Full description recorded for this expense.
                  </p>
                </div>
                <div className="p-4">
                  {selected.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selected.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No additional description was recorded for this expense.
                    </p>
                  )}
                </div>
              </section>

              <section
                aria-label="Expense reference and receipt"
                className="mt-5 rounded-xl border bg-card"
              >
                <div className="border-b p-4">
                  <h3 className="text-sm font-semibold">Reference &amp; receipt</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attached payment reference or receipt document, when available.
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    <Link2 size={14} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      No payment reference or receipt file is attached to this expense yet.
                    </span>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
