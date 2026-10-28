import type { Metadata } from "next";
import { ExpensesClient } from "@/components/financial/expenses-client";
import { listFinanceExpenses, type ApiFinanceExpense } from "@/lib/api/finance";
import { academicErrorMessage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Expenses | School Admin",
};

export default async function Page() {
  let expenses: ApiFinanceExpense[] = [];
  let loadError = "";

  try {
    expenses = await listFinanceExpenses();
  } catch (cause) {
    loadError = academicErrorMessage(cause, "Unable to load expenses");
  }

  return <ExpensesClient initialExpenses={expenses} initialError={loadError} />;
}
