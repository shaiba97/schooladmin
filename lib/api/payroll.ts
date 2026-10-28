import { adminApiFetch } from "./client";

export type PayrollDeduction = {
  id: string;
  ruleId: string | null;
  label: string;
  valueType: string;
  value: number;
  amount: number;
  note: string;
};

export type ApiPayout = {
  id: string;
  userId: string;
  staffName: string;
  staffNumber: string;
  staffEmail: string;
  staffPhone: string;
  staffSubject: string;
  departmentName: string;
  payslipNo: string;
  positionAssignmentId: string;
  positionTitle: string;
  financialPeriodId: string | null;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  currencyCode: string;
  status: "paid" | "approved" | "draft" | "cancelled" | string;
  accountId: string | null;
  approvedBy: string | null;
  paidAt: string | null;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdAt: string;
  deductions: PayrollDeduction[];
};

export function listFinancePayouts(limit = 0) {
  return adminApiFetch<ApiPayout[]>(
    `/finance/salary-payouts?limit=${limit}`,
  );
}

export function payoutPayslipUrl(payoutId: string) {
  return `/api/backend/finance/salary-payouts/${encodeURIComponent(payoutId)}/payslip`;
}
