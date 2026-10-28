"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoorOpen, LayoutGrid, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDUCATION_LEVELS,
  GRADE_LABELS,
  useLevelGradeTrack,
  type EducationLevel,
} from "@/components/academics/use-level-grade-track";
import { createHall, deleteHall, listHalls, updateHall } from "@/lib/api/halls";
import { listClasses } from "@/lib/api/classes";
import { academicErrorMessage } from "@/lib/format";
import type { ApiHall, ApiSchoolClass } from "@/lib/api/types";

function roomNumberOf(hallName: string): number | null {
  const match = hallName.match(/ Room (\d+)$/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isInteger(value) ? value : null;
}

function classOfRoom(hallName: string): string {
  return hallName.replace(/ Room \d+$/, "") || hallName;
}

function nextRoomNumber(className: string, rooms: ApiHall[]): number {
  const prefix = `${className} Room `;
  let max = 0;
  for (const room of rooms) {
    if (!room.name.startsWith(prefix)) continue;
    const value = roomNumberOf(room.name) ?? 0;
    if (value > max) max = value;
  }
  return max + 1;
}

/**
 * Room Wizard. Rooms are halls whose name encodes the class they serve:
 * `<Class name> Room <n>`. The room number is derived on the client, so the
 * backend stays a plain hall CRUD and the naming rule lives in one place.
 */
export function RoomsClient({
  initialRooms,
  initialClasses,
  loadError,
}: {
  initialRooms: ApiHall[];
  initialClasses: ApiSchoolClass[];
  loadError: string;
}) {
  const router = useRouter();
  const cascade = useLevelGradeTrack();

  const [rooms, setRooms] = React.useState<ApiHall[]>(initialRooms);
  const [classes, setClasses] = React.useState<ApiSchoolClass[]>(initialClasses);
  const [error, setError] = React.useState(loadError);
  const [loading, setLoading] = React.useState(initialRooms.length === 0 && initialClasses.length === 0);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [classId, setClassId] = React.useState("");
  const [capacity, setCapacity] = React.useState("30");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const [editTarget, setEditTarget] = React.useState<ApiHall | null>(null);
  const [editCapacity, setEditCapacity] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<ApiHall | null>(null);

  React.useEffect(() => {
    if (initialRooms.length > 0 || initialClasses.length > 0) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([listHalls(), listClasses({ page: 1, limit: 999 })])
      .then(([roomList, classPage]) => {
        if (cancelled) return;
        setRooms(roomList);
        setClasses(classPage.data);
      })
      .catch((cause) => {
        if (!cancelled) setError(academicErrorMessage(cause, "Unable to load rooms"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialRooms.length, initialClasses.length]);

  const availableClasses = React.useMemo(
    () =>
      classes.filter(
        (schoolClass) =>
          schoolClass.educationLevel === cascade.educationLevel &&
          schoolClass.grade === cascade.grade &&
          (cascade.needsTrack ? schoolClass.track === cascade.track : true),
      ),
    [classes, cascade.educationLevel, cascade.grade, cascade.needsTrack, cascade.track],
  );

  const selectedClass = availableClasses.find((schoolClass) => schoolClass.id === classId) ?? null;
  const autoRoomNumber = selectedClass ? nextRoomNumber(selectedClass.className, rooms) : null;
  const roomName =
    selectedClass && autoRoomNumber != null ? `${selectedClass.className} Room ${autoRoomNumber}` : "";

  const grouped = React.useMemo(() => {
    const map = new Map<string, ApiHall[]>();
    for (const room of rooms) {
      const className = classOfRoom(room.name);
      const list = map.get(className) ?? [];
      list.push(room);
      map.set(className, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([className, list]) => ({
        className,
        rooms: list.sort(
          (a, b) => (roomNumberOf(a.name) ?? 0) - (roomNumberOf(b.name) ?? 0),
        ),
      }));
  }, [rooms]);

  const totalSeats = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
  const classByName = React.useMemo(
    () => new Map(classes.map((schoolClass) => [schoolClass.className, schoolClass])),
    [classes],
  );

  function resetCreate() {
    setClassId("");
    setCapacity("30");
    setFormError("");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const cap = Number(capacity);
    if (!selectedClass || !roomName) {
      setFormError("Select the class this room serves.");
      return;
    }
    if (!Number.isFinite(cap) || cap < 1) {
      setFormError("Capacity must be at least 1 seat.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const created = await createHall({ name: roomName, capacity: cap });
      setRooms((current) => [...current, created]);
      setCreateOpen(false);
      resetCreate();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, `${roomName} may already exist.`));
    } finally {
      setPending(false);
    }
  }

  function openEdit(room: ApiHall) {
    setEditTarget(room);
    setEditCapacity(String(room.capacity));
    setFormError("");
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    const cap = Number(editCapacity);
    if (!Number.isFinite(cap) || cap < 1) {
      setFormError("Capacity must be at least 1 seat.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const updated = await updateHall(editTarget.id, { capacity: cap });
      setRooms((current) => current.map((room) => (room.id === updated.id ? updated : room)));
      setEditTarget(null);
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "The room capacity could not be saved."));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await deleteHall(deleteTarget.id);
      setRooms((current) => current.filter((room) => room.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(academicErrorMessage(cause, "The room could not be deleted."));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/academic/examinations"
            className="-ms-2 mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Examination Center
          </Link>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Examination Center · Room Wizard
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One room per class — pick a class, the room number is assigned automatically, and set
            how many candidates it seats.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
          >
            <Plus size={14} aria-hidden /> New room
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile icon={DoorOpen} label="Rooms" value={rooms.length} />
        <SummaryTile icon={LayoutGrid} label="Total seats" value={totalSeats} />
        <SummaryTile icon={Users} label="Classes served" value={grouped.length} />
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          description="Create the first room so exams can seat candidates."
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const roster = classByName.get(group.className)?.counts?.students ?? null;
            return (
              <Card key={group.className}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">{group.className}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {group.rooms.length} room{group.rooms.length === 1 ? "" : "s"}
                      </Badge>
                      {roster != null ? <span>{roster} students on roll</span> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.rooms.map((room) => {
                    const roomNo = roomNumberOf(room.name);
                    const overCapacity = roster != null && roster > room.capacity;
                    return (
                      <div
                        key={room.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-sm font-semibold tabular-nums">
                            {roomNo ?? "—"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{room.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Capacity {room.capacity} ·{" "}
                              {room.type === "VIRTUAL" ? "Virtual" : "Physical"}
                              {overCapacity ? (
                                <span className="text-amber-600"> · roster exceeds capacity</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/school/admin/exams/rooms/${room.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Seating
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit capacity for ${room.name}`}
                            onClick={() => openEdit(room)}
                          >
                            <Pencil size={14} aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${room.name}`}
                            onClick={() => setDeleteTarget(room)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setCreateOpen(false);
            resetCreate();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(event) => void handleCreate(event)}>
            <DialogHeader>
              <DialogTitle>New room</DialogTitle>
              <DialogDescription>
                Choose the class, then set the capacity. The room number follows the class
                automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select
                    value={cascade.educationLevel}
                    onValueChange={(value) => {
                      cascade.setEducationLevel(value as EducationLevel);
                      setClassId("");
                    }}
                  >
                    <SelectTrigger aria-label="Educational level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level === "SECONDARY" ? "Secondary" : "Intermediate"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select
                    value={cascade.grade}
                    onValueChange={(value) => {
                      cascade.setGrade(value);
                      setClassId("");
                    }}
                  >
                    <SelectTrigger aria-label="Grade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cascade.grades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {GRADE_LABELS[grade as keyof typeof GRADE_LABELS] ?? grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cascade.needsTrack ? (
                  <div className="space-y-2">
                    <Label>Track</Label>
                    <Select
                      value={cascade.track ?? ""}
                      onValueChange={(value) => {
                        cascade.setTrack(value);
                        setClassId("");
                      }}
                    >
                      <SelectTrigger aria-label="Track">
                        <SelectValue placeholder="Track" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ART">Art</SelectItem>
                        <SelectItem value="SCIENCE">Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                {availableClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes registered for this level/grade yet.
                  </p>
                ) : (
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger aria-label="Class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((schoolClass) => (
                        <SelectItem key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Room name</span>
                  <span className="truncate font-medium">{roomName || "Pick a class"}</span>
                </p>
                {autoRoomNumber != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    This will be room #{autoRoomNumber} for {selectedClass?.className}.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input
                  id="room-capacity"
                  inputMode="numeric"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </div>
            </div>
            {formError ? (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate();
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !selectedClass}>
                {pending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden /> Creating…
                  </>
                ) : (
                  "Create room"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open && !pending) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={(event) => void handleEdit(event)}>
            <DialogHeader>
              <DialogTitle>Edit capacity</DialogTitle>
              <DialogDescription>{editTarget?.name}</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-2">
              <Label htmlFor="edit-capacity">Capacity</Label>
              <Input
                id="edit-capacity"
                inputMode="numeric"
                value={editCapacity}
                onChange={(event) => setEditCapacity(event.target.value)}
              />
            </div>
            {formError ? (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save capacity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be removed from the room list. Seating for exams that use it
              is removed too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon size={16} aria-hidden />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
