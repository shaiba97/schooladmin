import type { Metadata } from "next";
import { StudentPaymentsClient } from "@/components/financial/student-payments-client";
import { listFinancePayments, type ApiFinancePayment } from "@/lib/api/finance";
import { academicErrorMessage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Student Payments | School Admin",
};

export default async function Page() {
  let payments: ApiFinancePayment[] = [];
  let loadError = "";

  try {
    payments = await listFinancePayments();
  } catch (cause) {
    loadError = academicErrorMessage(cause, "Unable to load student payments");
  }

  return <StudentPaymentsClient initialPayments={payments} initialError={loadError} />;
}
