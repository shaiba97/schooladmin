import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/portal/admin-dashboard-client";
import {
  getFinanceDashboard,
  listFinanceExpenses,
  listFinancePayments,
  type ApiFinanceExpense,
} from "@/lib/api/finance";
import { listFinancePayouts } from "@/lib/api/payroll";
import { listStaff } from "@/lib/api/staff";
import { listStudents } from "@/lib/api/students";
import type { ApiPaginated, ApiStaffDirectoryMember, ApiStudent } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard | School Admin",
};

export default async function Page() {
  const [statsBody, paymentsBody, expensesBody, payoutsBody, studentsBody, staffBody] =
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

  const errors: string[] = [];
  if (!statsBody.ok) errors.push(academicErrorMessage(statsBody.cause, "Unable to load dashboard stats"));
  if (!paymentsBody.ok) errors.push(academicErrorMessage(paymentsBody.cause, "Unable to load payments"));
  if (!expensesBody.ok) errors.push(academicErrorMessage(expensesBody.cause, "Unable to load expenses"));
  if (!payoutsBody.ok) errors.push(academicErrorMessage(payoutsBody.cause, "Unable to load payouts"));
  if (!studentsBody.ok) errors.push(academicErrorMessage(studentsBody.cause, "Unable to load students"));
  if (!staffBody.ok) errors.push("Unable to load staff directory");

  const stats = statsBody.ok ? statsBody.value : null;
  const payments = paymentsBody.ok ? paymentsBody.value : [];
  const expenses = (expensesBody.ok ? expensesBody.value : []) as ApiFinanceExpense[];
  const payouts = payoutsBody.ok ? payoutsBody.value : [];
  const students = (studentsBody.ok ? studentsBody.value : null) as ApiPaginated<ApiStudent> | null;
  const staff = (staffBody.ok ? staffBody.value : []) as ApiStaffDirectoryMember[];

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialPayments={payments}
      initialExpenses={expenses}
      initialPayouts={payouts}
      initialStudents={students}
      initialStaff={staff}
      initialError={errors.join(" · ")}
    />
  );
}
