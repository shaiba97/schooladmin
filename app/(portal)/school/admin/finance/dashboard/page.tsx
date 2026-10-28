import type { Metadata } from "next";
import { FinanceDashboardClient } from "@/components/financial/finance-dashboard-client";
import {
  getFinanceDashboard,
  listFinanceExpenses,
  listFinancePayments,
  type ApiFinanceExpense,
  type ApiFinancePayment,
  type FinanceDashboardStats,
} from "@/lib/api/finance";
import { listFinancePayouts, type ApiPayout } from "@/lib/api/payroll";
import { academicErrorMessage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Financial Dashboard | School Admin",
};

export default async function Page() {
  let stats: FinanceDashboardStats | null = null;
  let payments: ApiFinancePayment[] = [];
  let expenses: ApiFinanceExpense[] = [];
  let payouts: ApiPayout[] = [];
  const errors: string[] = [];

  const [
    statsResult,
    paymentsResult,
    expensesResult,
    payoutsResult,
  ] = await Promise.all([
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
  ]);

  if (statsResult.ok) stats = statsResult.value;
  else errors.push(academicErrorMessage(statsResult.cause, "Unable to load financial stats"));

  if (paymentsResult.ok) payments = paymentsResult.value;
  else errors.push(academicErrorMessage(paymentsResult.cause, "Unable to load payments"));

  if (expensesResult.ok) expenses = expensesResult.value;
  else errors.push(academicErrorMessage(expensesResult.cause, "Unable to load expenses"));

  if (payoutsResult.ok) payouts = payoutsResult.value;
  else errors.push(academicErrorMessage(payoutsResult.cause, "Unable to load payouts"));

  return (
    <FinanceDashboardClient
      initialStats={stats}
      initialPayments={payments}
      initialExpenses={expenses}
      initialPayouts={payouts}
      initialError={errors.join(" · ")}
    />
  );
}
