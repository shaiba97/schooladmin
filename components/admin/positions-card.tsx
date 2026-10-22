"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { createSchoolPosition, deleteSchoolPosition } from "@/lib/api/school-admin";
import type { ApiSchoolPosition } from "@/lib/api/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The positions a school holds, and the ones it may create. A position
 * belongs to a portal, and a school may only hold positions for the portals
 * its plan grants - so the portal list here is the tier's list, and the
 * server refuses anything else.
 */
export function PositionsCard({
  positions,
  allowedPositions,
  portals,
  onChanged,
}: {
  positions: ApiSchoolPosition[];
  allowedPositions: Array<{ position: string; label: string }>;
  portals: Array<{ portal: string; unlocked: boolean }>;
  onChanged: () => Promise<void> | void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [portal, setPortal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const unlockedPortals = portals.filter((row) => row.unlocked);

  React.useEffect(() => {
    if (!portal && unlockedPortals.length > 0) {
      setPortal(unlockedPortals[0].portal);
    }
  }, [portal, unlockedPortals]);

  async function create() {
    if (!title.trim() || !portal) {
      setError("Give the position a name and pick the portal it serves.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSchoolPosition({ title: title.trim(), portal });
      setTitle("");
      setCreating(false);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The position could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setPendingDelete(id);
    setError(null);
    try {
      await deleteSchoolPosition(id);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The position could not be deleted.",
      );
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm">Positions</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={unlockedPortals.length === 0}
            onClick={() => setCreating(true)}
          >
            <Plus size={14} aria-hidden />
            New position
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allowedPositions.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            You can staff {allowedPositions.map((row) => row.label).join(", ")} on
            your current plan.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your plan does not include any staff portal yet.
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {positions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This school has no positions yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y border-t">
            {positions.map((position) => (
              <li
                key={position.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{position.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {position.portal
                      ? `${position.portal.toLowerCase()} portal`
                      : "no portal"}
                    {position.members > 0
                      ? ` · ${position.members} ${position.members === 1 ? "person" : "people"}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {position.portal ? (
                    <Badge variant="outline" className="capitalize">
                      {position.portal.toLowerCase()}
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={
                      position.members > 0 ||
                      pendingDelete === position.id ||
                      position.isSystemRole
                    }
                    title={
                      position.members > 0
                        ? "Move the people in this position first"
                        : position.isSystemRole
                          ? "A system position cannot be deleted"
                          : "Delete this position"
                    }
                    onClick={() => void remove(position.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {creating ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : setCreating(false))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New position</DialogTitle>
              <DialogDescription>
                A position belongs to one of the portals your plan includes. Staff
                are added to it afterwards.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position-title">Title</Label>
                <Input
                  id="position-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Head of Transport"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position-portal">Portal</Label>
                <Select value={portal} onValueChange={setPortal}>
                  <SelectTrigger id="position-portal">
                    <SelectValue placeholder="Choose a portal" />
                  </SelectTrigger>
                  <SelectContent>
                    {unlockedPortals.map((row) => (
                      <SelectItem key={row.portal} value={row.portal}>
                        {row.portal.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void create()}>
                {saving ? "Creating…" : "Create position"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </Card>
  );
}
