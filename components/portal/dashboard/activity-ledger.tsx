"use client";

import { CircleCheck, ReceiptText, Wallet } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceDashboardActivity } from "@/lib/api/finance";
import { formatMoney } from "@/lib/dashboard-format";

const ACTIVITY_META: Record<string, { label: string; variant: BadgeVariant; icon: typeof Wallet }> = {
  COLLECTION: { label: "Payment", variant: "success", icon: Wallet },
  EXPENSE: { label: "Expense", variant: "warning", icon: ReceiptText },
  PAYROLL: { label: "Payroll", variant: "info", icon: Wallet },
};

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatActivityDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

export function ActivityLedger({
  activity,
  currency,
  loading,
}: {
  activity: FinanceDashboardActivity[];
  currency: string;
  loading: boolean;
}) {
  return (
    <Card className="gap-0 lg:col-span-2">
      <CardHeader className="border-b">
        <CardTitle>Recent activity ledger</CardTitle>
        <CardDescription>Latest admissions, payments, results, and expenses across the tenant.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-3 w-10/12" />
            <Skeleton className="h-3 w-8/12" />
          </div>
        ) : activity.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={CircleCheck}
              title="No recent activity"
              description="System events will stream in here as they happen."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Five most recent system actions</caption>
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Type
                  </th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Details
                  </th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="h-10 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 5).map((entry, index) => {
                  const meta = ACTIVITY_META[entry.type.toUpperCase()] ?? {
                    label: entry.type,
                    variant: "muted" as BadgeVariant,
                    icon: Wallet,
                  };
                  const Icon = meta.icon;
                  return (
                    <tr key={`${entry.type}-${entry.at ?? index}-${index}`} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <Badge variant={meta.variant} className="whitespace-nowrap">
                          <Icon size={12} aria-hidden />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-foreground/85">{entry.title}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatActivityDate(entry.at)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                        {formatMoney(entry.amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
