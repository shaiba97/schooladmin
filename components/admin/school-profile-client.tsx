"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  schoolAdminOverview,
  updateSchoolAdminProfile,
  updateSchoolTenant,
} from "@/lib/api/school-admin";
import type { ApiSchoolAdminOverview } from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoCard } from "@/components/admin/personal-info-card";
import { TenantInfoCard } from "@/components/admin/tenant-info-card";
import { SubscriptionCard } from "@/components/admin/subscription-card";
import { PositionsCard } from "@/components/admin/positions-card";

const TABS = [
  { key: "general", label: "Personal & School" },
  { key: "subscription", label: "Subscription" },
  { key: "roles", label: "Positions" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SchoolProfileClient() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") ?? "general";
  const initialTab = (TABS.some((tab) => tab.key === requested)
    ? requested
    : "general") as TabKey;

  const [tab, setTab] = React.useState<TabKey>(initialTab);
  const [overview, setOverview] = React.useState<ApiSchoolAdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await schoolAdminOverview());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load your school profile.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function selectTab(next: string) {
    const value = (TABS.some((entry) => entry.key === next) ? next : "general") as TabKey;
    setTab(value);
    window.history.replaceState(null, "", `/admin/profile?tab=${value}`);
  }

  if (loading && !overview) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="border-t border-destructive/40 pt-4">
        <p className="text-sm font-medium text-destructive">Profile unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">School Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account, your school, and the plan it pays for.
        </p>
      </header>

      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList className="w-full justify-start">
          {TABS.map((entry) => (
            <TabsTrigger key={entry.key} value={entry.key}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-4">
          <PersonalInfoCard
            admin={overview.admin}
            onSave={async (input) => {
              const updated = await updateSchoolAdminProfile(input);
              setOverview((current) =>
                current
                  ? {
                      ...current,
                      admin: { ...current.admin, ...updated },
                    }
                  : current,
              );
            }}
          />
          <TenantInfoCard
            tenant={overview.tenant}
            onSave={async (input) => {
              const updated = await updateSchoolTenant(input);
              setOverview((current) =>
                current ? { ...current, tenant: { ...current.tenant, ...updated } } : current,
              );
            }}
          />
        </TabsContent>

        <TabsContent value="subscription" className="pt-4">
          <SubscriptionCard
            subscription={overview.subscription}
            portals={overview.portals}
            upgrades={overview.upgrades}
          />
        </TabsContent>

        <TabsContent value="roles" className="flex flex-col gap-4 pt-4">
          <PositionsCard
            positions={overview.positions}
            allowedPositions={overview.allowedPositions}
            portals={overview.portals}
            onChanged={load}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
