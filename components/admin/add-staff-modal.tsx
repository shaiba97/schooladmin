"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StaffPositionKey =
  | "FINANCIAL_AFFAIRS"
  | "ACADEMIC_AFFAIRS"
  | "RECEPTIONIST"
  | "TRANSPORT_COORDINATOR"
  | "PRINCIPAL"
  | "JANITOR"
  | "LIBRARIAN"
  | "CUSTOM";

export const POSITION_LABEL: Record<StaffPositionKey, string> = {
  FINANCIAL_AFFAIRS: "Financial Affairs (Accountant)",
  ACADEMIC_AFFAIRS: "Academic Affairs",
  RECEPTIONIST: "Receptionist",
  TRANSPORT_COORDINATOR: "Transport Coordinator",
  PRINCIPAL: "Principal",
  JANITOR: "Janitor",
  LIBRARIAN: "Librarian",
  CUSTOM: "Other / Custom Role...",
};

const POSITION_KEYS = Object.keys(POSITION_LABEL) as StaffPositionKey[];

/** Positions that receive portal login credentials. */
export const SYSTEM_ACCESS_POSITIONS: StaffPositionKey[] = [
  "FINANCIAL_AFFAIRS",
  "ACADEMIC_AFFAIRS",
  "RECEPTIONIST",
  "TRANSPORT_COORDINATOR",
];

export function positionHasSystemAccess(position: string): boolean {
  return (SYSTEM_ACCESS_POSITIONS as string[]).includes(position);
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  staffNumber: string;
  status: string;
  position: string;
  positionTitle: string;
  hasSystemAccess: boolean;
  memberships: { roles: { role: { slug: string; name: string } }[] }[];
}

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initial?: StaffMember | null;
}

export function AddStaffModal({ open, onOpenChange, onSaved, initial }: AddStaffModalProps) {
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [position, setPosition] = React.useState<StaffPositionKey>("RECEPTIONIST");
  const [customTitle, setCustomTitle] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [previewId, setPreviewId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdId, setCreatedId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setFullName(`${initial.firstName} ${initial.lastName || ""}`.trim());
      setPhone(initial.phone);
      const key = (POSITION_KEYS as string[]).includes(initial.position)
        ? (initial.position as StaffPositionKey)
        : "CUSTOM";
      setPosition(key);
      setCustomTitle(key === "CUSTOM" ? initial.positionTitle : "");
      setPreviewId(initial.staffNumber);
    } else {
      setFullName(""); setPhone("");
      setPosition("RECEPTIONIST"); setCustomTitle("");
      setPreviewId("");
    }
    setPassword(""); setShowPassword(false);
    setSaving(false); setError(null); setCreatedId("");
  }, [open, initial]);

  // Live staff-ID preview for new staff: same server-side sequence, per position.
  React.useEffect(() => {
    if (!open || initial) return;
    let cancelled = false;
    adminApiFetch<{ staffNumber: string }>(`/staff/next-number?position=${position}`)
      .then((res) => { if (!cancelled) setPreviewId(res.staffNumber ?? ""); })
      .catch(() => { if (!cancelled) setPreviewId(""); });
    return () => { cancelled = true; };
  }, [open, initial, position]);

  const needsAccess = positionHasSystemAccess(position);
  const needsCustomTitle = position === "CUSTOM";

  const canSave =
    fullName.trim() !== "" &&
    phone.trim() !== "" &&
    (!needsCustomTitle || customTitle.trim() !== "") &&
    (needsAccess ? password.length >= 8 || !!initial : true) &&
    !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        position,
        ...(needsCustomTitle ? { customPositionTitle: customTitle.trim() } : {}),
      };
      if (initial) {
        await adminApiFetch(`/staff/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        // hasSystemAccess is derived server-side; password only ever sent for access roles.
        // Login credential = staff ID + password. Nothing is sent via SMS/email.
        if (needsAccess) body.password = password;
        const result = await adminApiFetch<{ staffNumber: string }>("/staff", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setCreatedId(result.staffNumber);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              {initial ? "Staff ID" : "Staff ID (auto-generated)"}
            </p>
            <p className="text-lg font-mono font-semibold">
              {previewId || "…"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-fullName">Full Name</Label>
            <Input
              id="staff-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-phone">Phone Number</Label>
            <Input
              id="staff-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+249..."
            />
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={(v) => { if (v) setPosition(v as StaffPositionKey); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {POSITION_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsCustomTitle && (
            <div className="space-y-2">
              <Label htmlFor="staff-custom">Custom Position Name</Label>
              <Input
                id="staff-custom"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom position name"
              />
            </div>
          )}
          {needsAccess && !initial && (
            <div className="space-y-4 rounded-md border p-3">
              <p className="text-sm font-medium">System Access / Credentials</p>
              <p className="text-xs text-muted-foreground">
                Login credential is the Staff ID above plus the password below.
              </p>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Password</Label>
                <div className="relative">
                  <Input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {createdId && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">Generated Staff ID</p>
              <p className="text-lg font-mono font-semibold">{createdId}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
