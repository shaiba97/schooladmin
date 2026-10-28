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
import type { ApiSchoolAdminOverview } from "@/lib/api/types";

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
  /**
   * Positions the school's active plan tier grants, from
   * GET /school-admin/overview. The server rejects disallowed positions with
   * an explicit 403 either way; when the overview could not be loaded this is left
   * null and the select shows every position (server remains the backstop).
   */
  allowedPositions?: ApiSchoolAdminOverview["allowedPositions"] | null;
}

export function AddStaffModal({
  open,
  onOpenChange,
  onSaved,
  initial,
  allowedPositions = null,
}: AddStaffModalProps) {
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

  /**
   * Positions the select offers under the school's plan tier. The server
   * rejects disallowed positions with a 403 on POST/PATCH /staff either way;
   * a null/failed overview means every position is shown (backstop).
   *
   * CUSTOM names its portal at creation time, so it is always offered — the
   * backend computes allowedPositions the same way. In edit mode the member's
   * current position stays selectable so an existing account (e.g. added
   * under a richer plan that the school later downgraded from) is still
   * editable without appearing broken.
   */
  const permittedKeys = React.useMemo(() => {
    const permitted = new Set(
      (allowedPositions ?? []).map((row) => row.position).filter(Boolean),
    );
    permitted.add("CUSTOM" as StaffPositionKey);
    if (initial) permitted.add(initial.position as StaffPositionKey);
    return POSITION_KEYS.filter((k) => permitted.has(k));
  }, [allowedPositions, initial]);
  const tierLimited = Boolean(allowedPositions) && permittedKeys.length < POSITION_KEYS.length;

  // Default a fresh create to the first permitted position when the tier no
  // longer covers the old default (RECEPTIONIST without the reception portal).
  React.useEffect(() => {
    if (!open || initial) return;
    if (permittedKeys.length > 0 && !permittedKeys.includes(position)) {
      setPosition(permittedKeys[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, permittedKeys]);

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
                {permittedKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {POSITION_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tierLimited && (
              <p className="text-xs text-muted-foreground">
                Positions are limited to the portals your school plan grants.
                Position assignments outside the plan are refused.
              </p>
            )}
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
