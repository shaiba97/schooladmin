"use client";

import * as React from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TenantInfoCard({
  tenant,
  onSave,
}: {
  tenant: {
    name: string;
    nameAr: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    countryCode: string | null;
    currencyCode: string;
    timezone: string;
  };
  onSave: (input: {
    name?: string;
    nameAr?: string | null;
    email?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    countryCode?: string | null;
    currencyCode?: string;
    timezone?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = React.useState(tenant.name);
  const [nameAr, setNameAr] = React.useState(tenant.nameAr ?? "");
  const [email, setEmail] = React.useState(tenant.email ?? "");
  const [phone, setPhone] = React.useState(tenant.phone ?? "");
  const [logoUrl, setLogoUrl] = React.useState(tenant.logoUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = React.useState(tenant.websiteUrl ?? "");
  const [countryCode, setCountryCode] = React.useState(tenant.countryCode ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(tenant.currencyCode);
  const [timezone, setTimezone] = React.useState(tenant.timezone);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const dirty =
    name !== tenant.name ||
    nameAr !== (tenant.nameAr ?? "") ||
    email !== (tenant.email ?? "") ||
    phone !== (tenant.phone ?? "") ||
    logoUrl !== (tenant.logoUrl ?? "") ||
    websiteUrl !== (tenant.websiteUrl ?? "") ||
    countryCode !== (tenant.countryCode ?? "") ||
    currencyCode !== tenant.currencyCode ||
    timezone !== tenant.timezone;

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave({
        name,
        nameAr: nameAr.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        logoUrl: logoUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        countryCode: countryCode.trim() || null,
        currencyCode,
        timezone,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the school.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">School details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-name">School name (English)</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-name-ar">School name (Arabic)</Label>
            <Input
              id="tenant-name-ar"
              dir="rtl"
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-email">Contact email</Label>
            <Input
              id="tenant-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-phone">Contact phone</Label>
            <Input
              id="tenant-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-logo">Logo URL</Label>
            <Input
              id="tenant-logo"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-website">Website</Label>
            <Input
              id="tenant-website"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-country">Country code</Label>
            <Input
              id="tenant-country"
              maxLength={2}
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              placeholder="SD"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-currency">Currency</Label>
            <Input
              id="tenant-currency"
              maxLength={3}
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tenant-timezone">Timezone</Label>
            <Input
              id="tenant-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Africa/Khartoum"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mt-3 text-sm text-muted-foreground">School settings saved.</p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save tenant settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
