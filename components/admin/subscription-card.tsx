"use client";

import * as React from "react";
import { CalendarClock, Lock, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { requestTierChange } from "@/lib/api/school-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS_VARIANT = {
  ACTIVE: "default",
  EXPIRING_SOON: "secondary",
  EXPIRED: "destructive",
  LOCKED: "destructive",
  NO_SUBSCRIPTION: "outline",
} as const;

/** The years a school may ask a term for. A year is the shortest term. */
const TERM_YEARS = [1, 2, 3, 4, 5] as const;

function money(value: number, currency: string) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyWhole(value: number, currency: string) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

export function SubscriptionCard({
  subscription,
  portals,
  upgrades,
}: {
  subscription: {
    tier: string;
    tierName: string;
    status: string;
    subscriptionStatus: keyof typeof STATUS_VARIANT;
    startedAt: string;
    expiresAt: string | null;
    daysRemaining: number | null;
    durationDays: number;
    studentCount: number;
    yearlyPrice: number;
    monthlyPrice: number;
    currency: string;
    portals: string[];
  } | null;
  portals: Array<{ portal: string; unlocked: boolean }>;
  upgrades: Array<{
    id: string;
    code: string;
    name: string;
    tier: string;
    yearlyPrice: number;
    monthlyPrice: number;
    currency: string;
    durationDays: number;
    portals: string[];
  }>;
}) {
  const [asking, setAsking] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  // The tier the school asks for, a term of whole years, and what the term
  // would cost the school.
  const [requestedPlanId, setRequestedPlanId] = React.useState("");
  const [years, setYears] = React.useState(1);

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This school has no licence yet. Contact platform support to set one up.
          </p>
        </CardContent>
      </Card>
    );
  }

  const days = subscription.daysRemaining;
  const remaining =
    days === null
      ? "no end date"
      : days < 0
        ? `expired ${Math.abs(days)} days ago`
        : `${days} days remaining`;

  async function send() {
    setSending(true);
    setError(null);
    try {
      await requestTierChange({ planId: requestedPlanId, years, note });
      setSent(true);
      setAsking(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The request could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">{subscription.tierName}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{subscription.tier}</Badge>
              <Badge variant={STATUS_VARIANT[subscription.subscriptionStatus]}>
                {subscription.subscriptionStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Monthly amount</dt>
              <dd className="font-mono text-lg">
                {money(subscription.monthlyPrice, subscription.currency)}
              </dd>
              <dd className="text-xs text-muted-foreground">
                {moneyWhole(subscription.yearlyPrice, subscription.currency)} a year
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Licensed students</dt>
              <dd className="font-mono text-lg">{subscription.studentCount}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Started</dt>
              <dd className="font-mono text-sm">
                {formatDate(subscription.startedAt)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Expires</dt>
              <dd className="font-mono text-sm">
                {formatDate(subscription.expiresAt)}
              </dd>
              <dd
                className={`text-xs ${
                  days !== null && days <= 30
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-muted-foreground"
                }`}
              >
                {remaining}
              </dd>
            </div>
          </dl>

          {subscription.subscriptionStatus === "EXPIRING_SOON" ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
              <CalendarClock size={15} aria-hidden />
              This plan ends soon. Renew it to keep every portal available.
            </p>
          ) : null}

          {sent ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your request was sent to platform support.
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSent(false);
                setRequestedPlanId(
                  upgrades.find((entry) => entry.code !== subscription.tier)?.id ??
                    "",
                );
                setYears(1);
                setAsking(true);
              }}
            >
              Request tier upgrade
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Portals your plan includes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {portals.map((row) => (
              <li
                key={row.portal}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  row.unlocked
                    ? "border-border"
                    : "border-dashed text-muted-foreground opacity-70"
                }`}
              >
                {row.unlocked ? (
                  <ShieldCheck size={15} className="text-primary" aria-hidden />
                ) : (
                  <Lock size={15} aria-hidden />
                )}
                <span className="capitalize">{row.portal.toLowerCase()}</span>
                {!row.unlocked ? (
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    Upgrade
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {asking ? (
        <RequestTierDialog
          currentTier={subscription.tier}
          upgrades={upgrades}
          years={years}
          onYearsChange={setYears}
          planId={requestedPlanId}
          onPlanChange={(id) => {
            setRequestedPlanId(id);
            setSent(false);
          }}
          note={note}
          onNoteChange={setNote}
          onClose={() => setAsking(false)}
          onSend={() => void send()}
          sending={sending}
          error={error}
        />
      ) : null}
    </div>
  );
}

function RequestTierDialog({
  currentTier,
  upgrades,
  years,
  onYearsChange,
  planId,
  onPlanChange,
  note,
  onNoteChange,
  onClose,
  onSend,
  sending,
  error,
}: {
  currentTier: string;
  upgrades: Array<{
    id: string;
    code: string;
    name: string;
    tier: string;
    yearlyPrice: number;
    monthlyPrice: number;
    currency: string;
    portals: string[];
  }>;
  years: number;
  onYearsChange: (years: number) => void;
  planId: string;
  onPlanChange: (planId: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
}) {
  const choices = upgrades.filter((entry) => entry.code !== currentTier);
  const chosen = choices.find((entry) => entry.id === planId);
  const due = chosen ? chosen.yearlyPrice * years : 0;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a tier change</DialogTitle>
          <DialogDescription>
            Your plan is set by the platform. Pick the tier you need and
            platform support will arrange the change.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tier-target">Tier</Label>
          <select
            id="tier-target"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed dark:bg-input/30"
            value={planId}
            onChange={(event) => onPlanChange(event.target.value)}
          >
            <option value="" disabled>
              Choose a tier
            </option>
            {choices.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.code})
              </option>
            ))}
          </select>
          {chosen ? (
            <p className="text-xs text-muted-foreground">
              {money(chosen.yearlyPrice, chosen.currency)} a year,{" "}
              {money(chosen.monthlyPrice, chosen.currency)} a month ·{" "}
              {chosen.portals.length} portals
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tier-years">Term</Label>
          <div className="flex gap-1" role="group" aria-label="Term in years">
            {TERM_YEARS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={years === option ? "default" : "outline"}
                onClick={() => onYearsChange(option)}
                aria-pressed={years === option}
              >
                {option} {option === 1 ? "year" : "years"}
              </Button>
            ))}
          </div>
          {chosen && due > 0 ? (
            <p className="text-xs text-muted-foreground">
              {moneyWhole(due, chosen.currency)} due for the term.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tier-note">Anything else?</Label>
          <Textarea
            id="tier-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="We added a transport fleet and need that portal."
            rows={3}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSend()}
            disabled={sending || !planId}
          >
            {sending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
