import type { Metadata } from "next";
import { TeacherPayoutsClient } from "@/components/financial/teacher-payouts-client";
import { listFinancePayouts, type ApiPayout } from "@/lib/api/payroll";
import { academicErrorMessage } from "@/lib/format";

export const metadata: Metadata = {
  title: "Teacher Payouts | School Admin",
};

export default async function Page() {
  let payouts: ApiPayout[] = [];
  let loadError = "";

  try {
    payouts = await listFinancePayouts();
  } catch (cause) {
    loadError = academicErrorMessage(cause, "Unable to load teacher payouts");
  }

  return <TeacherPayoutsClient initialPayouts={payouts} initialError={loadError} />;
}
