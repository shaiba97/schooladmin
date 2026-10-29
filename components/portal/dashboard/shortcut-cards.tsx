"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const SHORTCUTS = [
  {
    href: "/school/admin/exams",
    label: "Examination Center",
    caption: "Exams, rooms, and results",
    icon: ClipboardList,
    accent: "from-emerald-500/15 to-teal-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/school/admin/finance/payments",
    label: "Student Payment Ledgers",
    caption: "Fees, installments, receipts",
    icon: Receipt,
    accent: "from-teal-500/15 to-emerald-500/10 ring-teal-500/20 text-teal-600 dark:text-teal-400",
  },
  {
    href: "/school/admin/finance/payouts",
    label: "Teacher Payouts",
    caption: "Payroll runs and payslips",
    icon: Wallet,
    accent: "from-emerald-500/15 to-cyan-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/school/admin/staff/attendance",
    label: "Staff Attendance",
    caption: "Daily presence tracking",
    icon: CalendarDays,
    accent: "from-teal-500/15 to-emerald-500/10 ring-teal-500/20 text-teal-600 dark:text-teal-400",
  },
];

export function ShortcutCards() {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle>Quick shortcuts</CardTitle>
        <CardDescription>Jump straight into the busiest operational centers.</CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        {SHORTCUTS.length === 0 ? (
          <EmptyState title="No shortcuts configured" />
        ) : (
          <nav aria-label="Quick shortcuts" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {SHORTCUTS.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-emerald-500/30 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ${shortcut.accent}`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{shortcut.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{shortcut.caption}</span>
                  </span>
                  <ArrowRight
                    size={16}
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                  />
                </Link>
              );
            })}
          </nav>
        )}
      </CardContent>
    </Card>
  );
}
