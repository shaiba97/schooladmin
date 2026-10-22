"use client";

import * as React from "react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PersonalInfoCard({
  admin,
  onSave,
}: {
  admin: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    staffNumber: string | null;
  };
  onSave: (input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
}) {
  const [firstName, setFirstName] = React.useState(admin.firstName);
  const [lastName, setLastName] = React.useState(admin.lastName);
  const [email, setEmail] = React.useState(admin.email ?? "");
  const [phone, setPhone] = React.useState(admin.phone ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const dirty =
    firstName !== admin.firstName ||
    lastName !== admin.lastName ||
    email !== (admin.email ?? "") ||
    phone !== (admin.phone ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave({ firstName, lastName, email, phone });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Your account</CardTitle>
          <Badge variant="outline">SCHOOL_ADMIN</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-first-name">First name</Label>
            <Input
              id="profile-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-last-name">Last name</Label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          {admin.staffNumber ? (
            <div className="flex flex-col gap-1.5">
              <Label>Staff ID</Label>
              <p className="font-mono text-sm text-muted-foreground">{admin.staffNumber}</p>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mt-3 text-sm text-muted-foreground">Profile saved.</p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Update profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
