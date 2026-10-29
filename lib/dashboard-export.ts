/**
 * Client-side export helpers for the admin dashboard:
 * "Export Data" produces a combined activity CSV; "Generate Report"
 * opens the browser print dialog over the current dashboard view.
 */

import type {
  ApiFinanceExpense,
  ApiFinancePayment,
  FinanceDashboardActivity,
} from "@/lib/api/finance";
import type { ApiPayout } from "@/lib/api/payroll";

type LedgerRow = {
  timestamp: string;
  entryType: string;
  detail: string;
  method: string;
  amount: number;
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(table: { headers: string[]; rows: unknown[][] }) {
  const lines = [table.headers.map(csvCell).join(",")];
  for (const row of table.rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n");
}

function ledgerRows(
  stats: { recentActivity: FinanceDashboardActivity[] } | null,
  payments: ApiFinancePayment[],
  expenses: ApiFinanceExpense[],
  payouts: ApiPayout[],
): LedgerRow[] {
  const rows: LedgerRow[] = [];

  if (stats) {
    for (const entry of stats.recentActivity) {
      rows.push({
        timestamp: entry.at ?? "",
        entryType: entry.type,
        detail: entry.title,
        method: entry.method || "",
        amount: entry.amount,
      });
    }
  }

  rows.push(
    ...payments.map((payment) => ({
      timestamp: payment.paidAt ?? payment.createdAt,
      entryType: "payment",
      detail: payment.studentName
        ? `${payment.studentName} · ${payment.statusLabel || payment.paymentStatus || payment.status}`
        : payment.statusLabel || payment.paymentStatus,
      method: payment.method,
      amount: payment.amount,
    })),
  );
  rows.push(
    ...expenses.map((expense) => ({
      timestamp: expense.incurredAt ?? "",
      entryType: "expense",
      detail: expense.title,
      method: expense.status ?? "",
      amount: expense.amount,
    })),
  );
  rows.push(
    ...payouts.map((payout) => ({
      timestamp: payout.paidAt ?? payout.createdAt,
      entryType: "payout",
      detail: payout.staffName ? `${payout.staffName} · ${payout.periodName || payout.status}` : payout.status,
      method: payout.status ?? "",
      amount: payout.netAmount,
    })),
  );

  return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function buildActivityCsv(
  stats: { recentActivity: FinanceDashboardActivity[] } | null,
  payments: ApiFinancePayment[],
  expenses: ApiFinanceExpense[],
  payouts: ApiPayout[],
) {
  const rows = ledgerRows(stats, payments, expenses, payouts);
  return toCsv({
    headers: ["Timestamp", "Type", "Detail", "Method / Status", "Amount"],
    rows: rows.map((row) => [
      row.timestamp,
      row.entryType,
      row.detail,
      row.method,
      String(row.amount),
    ]),
  });
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function printDashboard() {
  window.print();
}

export function dashboardExportFilename(kind: string) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return `madar-${kind}-${stamp}.csv`;
}
