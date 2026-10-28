import { adminApiFetch } from "./client";

export type FinancePaymentAllocation = {
  kind: string;
  installmentNo: number | null;
  amount: number;
};

export type FinanceInstallmentProgress = {
  invoiceAmount: number;
  amountPaidToDate: number;
  percent: number;
};

export type FinanceInstallmentEffect = {
  contributed: number;
  amountBefore: number;
  amountAfter: number;
  isOpening: boolean;
  isFinal: boolean;
};

export type ApiFinancePayment = {
  id: string;
  studentId: string;
  studentName: string;
  roleNumber: string;
  educationLevel: string;
  grade: number | null;
  className: string;
  totalFee: number;
  amount: number;
  currencyCode: string;
  method: string;
  reference?: string;
  allocationKind: string;
  allocationTarget: string;
  installmentNo: number | null;
  installmentPaid: number;
  installmentAmount: number;
  balance: number;
  progress: number;
  status: string;
  daysLate: number;
  statusLabel: string;
  paymentStatus: string;
  paidAt: string;
  createdAt: string;
  isFinalPaymentOnInstallment: boolean;
  installmentProgress: FinanceInstallmentProgress | null;
  installmentEffect: FinanceInstallmentEffect | null;
};

export type FinanceGuardian = {
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
};

export type FinanceLedgerProfile = {
  id: string;
  name: string;
  roleNumber: string;
  educationLevel: string;
  grade: number | null;
  className: string;
  phone: string;
  guardians: FinanceGuardian[];
};

export type FinanceLedgerFeeRow = {
  label: string;
  amount: number;
  discount: number;
  net: number;
};

export type FinanceLedgerFee = {
  templateName: string;
  currency: string;
  rows: FinanceLedgerFeeRow[];
  total: number;
  totalDiscount: number;
  netTotal: number;
};

export type FinanceLedgerInstallment = {
  no: number;
  name: string;
  dueDate: string | null;
  amount: number;
  discounted: number;
  paid: number;
  remaining: number;
  status: string;
  overdue: boolean;
};

export type FinanceLedgerPayment = {
  id: string;
  ref: string;
  at: string | null;
  target: string;
  method: string;
  amount: number;
  currencyCode: string;
  status: string;
  by: string;
};

export type FinanceStudentLedger = {
  profile: FinanceLedgerProfile;
  fee: FinanceLedgerFee;
  installments: FinanceLedgerInstallment[];
  payments: FinanceLedgerPayment[];
  totals: {
    assigned: number;
    paid: number;
    balance: number;
    status: string;
    currency: string;
  };
};

export type ApiFinanceExpense = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  currencyCode: string;
  title: string;
  description: string;
  vendor: string;
  status: "paid" | "approved" | "pending" | "rejected" | string;
  incurredAt: string;
};

export function listFinanceExpenses() {
  return adminApiFetch<ApiFinanceExpense[]>("/finance/expenses");
}

export type FinanceDashboardActivity = {
  type: "COLLECTION" | "EXPENSE" | "PAYROLL" | string;
  title: string;
  amount: number;
  method: string;
  at: string | null;
};

export type FinanceDashboardStats = {
  tenant: { id: string; name: string };
  totalCollected: number;
  expenses: number;
  payroll: number;
  outflows: number;
  netCashFlow: number;
  collectionsLastMonth: number;
  collectionsChangePct: number | null;
  totalStudents: number;
  totalTeachers: number;
  outstandingFeeBalance: number | null;
  recentActivity: FinanceDashboardActivity[];
};

export function getFinanceDashboard() {
  return adminApiFetch<FinanceDashboardStats>("/finance/dashboard");
}

export function listFinancePayments(limit = 0) {
  return adminApiFetch<ApiFinancePayment[]>(`/finance/payments?limit=${limit}`);
}

export function getFinanceStudentLedger(studentId: string) {
  return adminApiFetch<FinanceStudentLedger>(
    `/finance/students/${encodeURIComponent(studentId)}/ledger`,
  );
}

export function paymentReceiptUrl(paymentId: string) {
  return `/api/backend/finance/payments/${encodeURIComponent(paymentId)}/receipt`;
}
