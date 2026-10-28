"use client";

import * as React from "react";
import {
  Banknote,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Download,
  GraduationCap,
  Hash,
  Loader2,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFinanceStudentLedger,
  listFinancePayments,
  paymentReceiptUrl,
  type ApiFinancePayment,
  type FinanceLedgerPayment,
  type FinanceStudentLedger,
} from "@/lib/api/finance";
import { academicErrorMessage } from "@/lib/format";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bankak: "Bankak",
  fawry: "Fawry",
  okash: "Okash",
  al_mashriq: "Al Mashriq",
  "al mashriq": "Al Mashriq",
  almashriq: "Al Mashriq",
  card: "Card",
  mada: "Mada",
  knet: "KNET",
  bank_transfer: "Bank Transfer",
};

const DATE_RANGES = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
] as const;

type DateRange = (typeof DATE_RANGES)[number]["value"];

const currencyFormatters = new Map<string, Intl.NumberFormat>();

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

function levelLabel(level: string | null | undefined) {
  if (!level) return "";
  const normalized = level.toUpperCase();
  if (normalized === "BASIC") return "Basic";
  if (normalized === "INTERMEDIATE") return "Intermediate";
  if (normalized === "SECONDARY") return "Secondary";
  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function gradeLabel(grade: number | null | undefined, level: string | null | undefined) {
  if (grade == null) return levelLabel(level);
  const ordinal = ORDINALS[grade] ?? `Grade ${grade}`;
  const levelName = levelLabel(level);
  return levelName ? `${ordinal} ${levelName}` : ordinal;
}

function classLabel(payment: ApiFinancePayment) {
  const className = payment.className?.trim();
  if (className) return className;
  return gradeLabel(payment.grade, payment.educationLevel) || "Class not assigned";
}

function methodLabel(method: string) {
  const key = (method || "").toLowerCase().replace(/-/g, "_");
  if (!key) return "Unknown";
  return (
    PAYMENT_METHOD_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function normalizeTarget(target: string | null | undefined) {
  const value = (target || "").trim();
  if (!value) return "Payment";
  return value
    .replace(/^Installment\s*#?\s*(\d+)$/i, "Installment $1")
    .replace(/^Lump[\s-]*Sum$/i, "Lump Sum")
    .replace(/^Registration$/i, "Registration Fee")
    .replace(/^Transport$/i, "Transport Fee");
}

function paymentTypeLabel(payment: ApiFinancePayment) {
  const target = normalizeTarget(payment.allocationTarget);
  if (target !== "Payment") return target;
  if (payment.allocationKind === "registration") return "Registration Fee";
  if (payment.allocationKind === "installment") {
    return payment.installmentNo ? `Installment ${payment.installmentNo}` : "Installment";
  }
  if (payment.allocationKind === "transport") return "Transport Fee";
  if (payment.allocationKind === "lump_sum") return "Lump Sum";
  return "Payment";
}

function typeBadgeVariant(label: string): BadgeVariant {
  if (label.startsWith("Registration")) return "purple";
  if (label.startsWith("Installment")) return "info";
  if (label.startsWith("Transport")) return "warning";
  if (label.startsWith("Lump")) return "secondary";
  return "outline";
}

function paymentStatus(status: string): { label: string; variant: BadgeVariant } {
  const normalized = (status || "").toUpperCase();
  if (normalized === "COMPLETED" || normalized === "SUCCESS") {
    return { label: "SUCCESS", variant: "success" };
  }
  if (normalized === "PENDING") return { label: "PENDING", variant: "warning" };
  if (normalized === "REFUNDED" || normalized === "REVERSED") {
    return { label: "REVERSED", variant: "purple" };
  }
  if (normalized === "FAILED") return { label: "FAILED", variant: "destructive" };
  return { label: normalized || "UNKNOWN", variant: "muted" };
}

function accountStatus(status: string): { label: string; variant: BadgeVariant } {
  const normalized = (status || "").toUpperCase();
  if (normalized === "FULLY_PAID") return { label: "Fully paid", variant: "success" };
  if (normalized === "OVERDUE") return { label: "Overdue", variant: "destructive" };
  if (normalized === "PARTIALLY_PAID") {
    return { label: "Partially paid", variant: "warning" };
  }
  return { label: normalized || "No fee plan", variant: "muted" };
}

function dateRangeStart(range: DateRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return start;
  if (range === "7d") {
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (range === "30d") {
    start.setDate(start.getDate() - 29);
    return start;
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

function isWithinRange(value: string, range: DateRange) {
  const start = dateRangeStart(range);
  if (!start) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start;
}

function referenceOf(payment: { id: string; reference?: string; ref?: string }) {
  return payment.reference || payment.ref || payment.id.slice(0, 8).toUpperCase();
}

function primaryGuardian(ledger: FinanceStudentLedger) {
  return (
    ledger.profile.guardians.find((guardian) => guardian.isPrimary) ??
    ledger.profile.guardians[0] ??
    null
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  return `${parts[0][0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] ?? "" : ""}`.toUpperCase();
}

function paymentTypeOptions(payments: ApiFinancePayment[]) {
  const labels = [...new Set(payments.map(paymentTypeLabel))];
  return labels.sort((a, b) => {
    if (a === "Registration Fee") return -1;
    if (b === "Registration Fee") return 1;
    if (a.startsWith("Installment") && !b.startsWith("Installment")) return -1;
    if (b.startsWith("Installment") && !a.startsWith("Installment")) return 1;
    return a.localeCompare(b);
  });
}

function PaymentStatusBadge({ status }: { status: string }) {
  const mapped = paymentStatus(status);
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}

function AccountStatusBadge({ status }: { status: string }) {
  const mapped = accountStatus(status);
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}

function LedgerSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading student financial history">
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentPaymentsClient({
  initialPayments,
  initialError,
}: {
  initialPayments: ApiFinancePayment[];
  initialError: string;
}) {
  const [payments, setPayments] = React.useState(initialPayments);
  const [loadError, setLoadError] = React.useState(initialError);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [paymentType, setPaymentType] = React.useState("all");
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ApiFinancePayment | null>(null);
  const [ledger, setLedger] = React.useState<FinanceStudentLedger | null>(null);
  const [ledgerError, setLedgerError] = React.useState("");
  const [ledgerLoading, setLedgerLoading] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState("");
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const ledgerRequest = React.useRef(0);

  const typeOptions = React.useMemo(() => paymentTypeOptions(payments), [payments]);
  const effectivePaymentType =
    paymentType === "all" || typeOptions.includes(paymentType) ? paymentType : "all";

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payments.filter((payment) => {
      if (!isWithinRange(payment.paidAt, dateRange)) return false;
      if (effectivePaymentType !== "all" && paymentTypeLabel(payment) !== effectivePaymentType) {
        return false;
      }
      if (!needle) return true;
      return [
        payment.studentName,
        payment.roleNumber,
        payment.className,
        payment.reference ?? "",
        payment.method,
        paymentTypeLabel(payment),
        paymentStatus(payment.statusLabel).label,
        formatDateTime(payment.paidAt),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [dateRange, effectivePaymentType, payments, query]);

  const filtersActive =
    query.trim() !== "" || effectivePaymentType !== "all" || dateRange !== "all";

  async function refreshPayments() {
    setRefreshing(true);
    try {
      const next = await listFinancePayments();
      setPayments(next);
      setLoadError("");
    } catch (cause) {
      setLoadError(academicErrorMessage(cause, "Unable to load student payments"));
    } finally {
      setRefreshing(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setPaymentType("all");
    setDateRange("all");
  }

  async function openLedger(payment: ApiFinancePayment) {
    const requestId = ledgerRequest.current + 1;
    ledgerRequest.current = requestId;
    setSelected(payment);
    setOpen(true);
    setLedger(null);
    setLedgerError("");
    setReceiptError("");
    setLedgerLoading(true);

    try {
      const next = await getFinanceStudentLedger(payment.studentId);
      if (ledgerRequest.current !== requestId) return;
      setLedger(next);
    } catch (cause) {
      if (ledgerRequest.current !== requestId) return;
      setLedgerError(academicErrorMessage(cause, "Unable to load this student's payment history"));
    } finally {
      if (ledgerRequest.current === requestId) setLedgerLoading(false);
    }
  }

  async function downloadReceipt(payment: FinanceLedgerPayment) {
    setDownloadingId(payment.id);
    setReceiptError("");
    try {
      const response = await fetch(paymentReceiptUrl(payment.id), {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Receipt download failed (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      link.download = filename ?? `receipt-${referenceOf(payment)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (cause) {
      setReceiptError(academicErrorMessage(cause, "Unable to download receipt"));
    } finally {
      setDownloadingId(null);
    }
  }

  const profile = ledger?.profile;
  const guardian = ledger ? primaryGuardian(ledger) : null;
  const history = ledger?.payments ?? [];
  const studentName = profile?.name || selected?.studentName || "Student";
  const selectedClassName = profile?.className || (selected ? classLabel(selected) : "-");
  const guardianName = guardian?.name || "";
  const guardianPhone = guardian?.phone || profile?.phone || "";
  const guardianRelation = guardian?.relationship || "";
  const extraGuardians = Math.max(0, (profile?.guardians.length ?? 0) - 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            School Admin / Financial Affairs
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ReceiptText size={20} className="text-primary" aria-hidden /> Student Payments
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every payment transaction, itemized by student, with lifetime account history and
            downloadable receipts.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshPayments()}
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

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{loadError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPayments()}
            disabled={refreshing}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Transactions
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{payments.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible after filters
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{filtered.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Installment payments
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {payments.filter((payment) => payment.allocationKind === "installment").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Registration payments
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {payments.filter((payment) => payment.allocationKind === "registration").length}
          </p>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>All payment transactions</CardTitle>
              <CardDescription>
                One row per transaction. Search by student name, roll number, transaction ID, or
                payment type.
              </CardDescription>
            </div>
            <Badge variant="muted" className="tabular-nums">
              {filtered.length} of {payments.length}
            </Badge>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px_170px_auto]">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search student, roll no, or transaction ID"
                aria-label="Search payments"
                className="ps-8"
              />
            </div>
            <Select value={effectivePaymentType} onValueChange={setPaymentType}>
              <SelectTrigger aria-label="Filter by payment type" className="h-8">
                <SelectValue placeholder="All payment types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment types</SelectItem>
                {typeOptions.map((option) => (
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
          {payments.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ReceiptText}
                title="No payment transactions yet"
                description="Recorded student payments will appear here as separate, itemized transactions."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="No payments match these filters"
                description="Try a different name, roll number, payment type, or date range."
                action={{ label: "Clear filters", onClick: clearFilters }}
              />
            </div>
          ) : (
            <div className={refreshing ? "pointer-events-none opacity-60" : undefined}>
              <table className="w-full min-w-[1080px] caption-bottom text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Student name &amp; roll no.
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Transaction ID
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Payment type / description
                    </th>
                    <th className="h-10 px-3 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Method
                    </th>
                    <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Date &amp; time
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
                  {filtered.map((payment) => {
                    const type = paymentTypeLabel(payment);
                    return (
                      <tr
                        key={payment.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() => void openLedger(payment)}
                            className="group max-w-[260px] text-left"
                          >
                            <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                              {payment.studentName || "Unknown student"}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Hash size={11} aria-hidden />
                                {payment.roleNumber || "No roll no."}
                              </span>
                              <span aria-hidden>-</span>
                              <span className="truncate">{classLabel(payment)}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="font-mono text-xs font-medium">
                            {referenceOf(payment)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant={typeBadgeVariant(type)}>{type}</Badge>
                          {payment.isFinalPaymentOnInstallment ? (
                            <span className="ms-1.5 text-[11px] text-muted-foreground">
                              Final on installment
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums text-success">
                          {formatMoney(payment.amount, payment.currencyCode)}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            {payment.method.toLowerCase() === "cash" ? (
                              <Banknote size={14} className="text-muted-foreground" aria-hidden />
                            ) : (
                              <CreditCard size={14} className="text-muted-foreground" aria-hidden />
                            )}
                            {methodLabel(payment.method)}
                          </span>
                        </td>
                        <td
                          className="px-3 py-3 align-middle text-muted-foreground"
                          title={payment.paidAt}
                        >
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <CalendarDays size={13} aria-hidden />
                            {formatDateTime(payment.paidAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <PaymentStatusBadge status={payment.paymentStatus || payment.statusLabel} />
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => void openLedger(payment)}
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
            <span className="font-medium text-foreground">{payments.length}</span> transactions
          </span>
          <span>Newest payment first</span>
        </CardFooter>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-3xl">
          <SheetHeader className="border-b p-5 pe-12">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider">
              Student financial record
            </SheetDescription>
            <SheetTitle className="text-lg">{studentName}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Personal details, fee plan, and complete lifetime payment history.
            </p>
          </SheetHeader>

          <div
            key={selected?.studentId ?? "no-student"}
            className="min-h-0 flex-1 overflow-y-auto p-5"
          >
            {ledgerLoading ? (
              <LedgerSkeleton />
            ) : ledgerError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <span>{ledgerError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selected && void openLedger(selected)}
                >
                  Retry
                </Button>
              </div>
            ) : ledger ? (
              <div className="space-y-5">
                <section className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(studentName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{studentName}</h2>
                        <AccountStatusBadge
                          status={
                            ledger.totals.assigned > 0 ? ledger.totals.status : "NO_FEE_PLAN"
                          }
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          <Hash size={11} aria-hidden /> {profile?.roleNumber || "No roll number"}
                        </Badge>
                        <Badge variant="muted">{selectedClassName}</Badge>
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Roll number</dt>
                      <dd className="mt-0.5 font-medium">{profile?.roleNumber || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Education level</dt>
                      <dd className="mt-0.5 font-medium">
                        {levelLabel(profile?.educationLevel) || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Grade</dt>
                      <dd className="mt-0.5 font-medium">
                        {profile?.grade != null ? `Grade ${profile.grade}` : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Class</dt>
                      <dd className="mt-0.5 font-medium">{profile?.className || "-"}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-muted-foreground" aria-hidden />
                      <div>
                        <p className="text-xs text-muted-foreground">Guardian contact</p>
                        <p className="text-sm font-medium">
                          {guardianName || "No guardian on file"}
                          {guardianRelation ? (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              ({guardianRelation})
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium tabular-nums">{guardianPhone || "-"}</p>
                      {extraGuardians > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          +{extraGuardians} more guardian{extraGuardians === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <GraduationCap size={14} aria-hidden />
                    <span>
                      Fee plan:{" "}
                      <span className="font-medium text-foreground">
                        {ledger.fee.templateName || "No fee plan assigned"}
                      </span>
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                    <div>
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <ReceiptText size={15} aria-hidden /> Lifetime payment history
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {history.length} transaction{history.length === 1 ? "" : "s"} across all
                        academic years.
                      </p>
                    </div>
                    {receiptError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {receiptError}
                      </p>
                    ) : null}
                  </div>

                  {history.length === 0 ? (
                    <div className="p-4">
                      <EmptyState
                        icon={Wallet}
                        title="No payments recorded"
                        description="This student has no payment transactions in their lifetime history yet."
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] caption-bottom text-sm">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Transaction ID
                            </th>
                            <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Fee type
                            </th>
                            <th className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Amount
                            </th>
                            <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Date &amp; time
                            </th>
                            <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Status
                            </th>
                            <th className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Receipt
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((payment) => (
                            <tr
                              key={payment.id}
                              className="border-b transition-colors last:border-0 hover:bg-muted/40"
                            >
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-xs font-medium">
                                  {referenceOf(payment)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-sm">{normalizeTarget(payment.target)}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-success">
                                {formatMoney(payment.amount, payment.currencyCode)}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                {formatDateTime(payment.at)}
                              </td>
                              <td className="px-3 py-2.5">
                                <PaymentStatusBadge status={payment.status} />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() => void downloadReceipt(payment)}
                                  disabled={downloadingId === payment.id}
                                  aria-label={`Download receipt ${referenceOf(payment)}`}
                                >
                                  {downloadingId === payment.id ? (
                                    <Loader2 size={13} className="animate-spin" aria-hidden />
                                  ) : (
                                    <Download size={13} aria-hidden />
                                  )}
                                  Receipt
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="grid overflow-hidden rounded-xl border md:grid-cols-3">
                  <div className="min-w-0 border-b p-4 md:border-b-0 md:border-e">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total lifetime fees billed
                    </p>
                    <p className="mt-1 break-words text-base font-semibold leading-tight tabular-nums md:text-lg">
                      {formatMoney(ledger.totals.assigned, ledger.totals.currency)}
                    </p>
                  </div>
                  <div className="min-w-0 border-b p-4 md:border-b-0 md:border-e">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total paid to date
                    </p>
                    <p className="mt-1 break-words text-base font-semibold leading-tight tabular-nums text-success md:text-lg">
                      {formatMoney(ledger.totals.paid, ledger.totals.currency)}
                    </p>
                  </div>
                  <div className="min-w-0 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Outstanding balance
                    </p>
                    <p
                      className={`mt-1 break-words text-base font-semibold leading-tight tabular-nums md:text-lg ${
                        ledger.totals.balance > 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {formatMoney(ledger.totals.balance, ledger.totals.currency)}
                    </p>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
