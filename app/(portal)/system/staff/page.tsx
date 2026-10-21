"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AddStaffModal,
  POSITION_LABEL,
  type StaffMember,
  type StaffPositionKey,
} from "@/components/admin/add-staff-modal";
import { Search, Plus, MoreVertical, Pencil, Trash2, ShieldCheck, ShieldOff, Eye, KeyRound } from "lucide-react";

const POSITION_KEYS = Object.keys(POSITION_LABEL) as StaffPositionKey[];

export default function StaffPage() {
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffMember | null>(null);
  const [viewing, setViewing] = React.useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StaffMember | null>(null);
  const [resetTarget, setResetTarget] = React.useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [showResetPassword, setShowResetPassword] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const data = await adminApiFetch<StaffMember[]>(`/staff?${params.toString()}`);
      setStaff(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [search, roleFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setDialogOpen(true);
  }

  async function toggleStatus(member: StaffMember) {
    const newStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await adminApiFetch(`/staff/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await adminApiFetch(`/staff/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  async function resetPassword() {
    if (!resetTarget || newPassword.length < 8) return;
    setResetting(true);
    try {
      await adminApiFetch(`/staff/${resetTarget.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      });
      setResetTarget(null);
      setNewPassword("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Staff Management</h1>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Staff
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, phone, or staff ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Positions</SelectItem>
                {POSITION_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {POSITION_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Position</th>
                    <th className="pb-2 pr-4 font-medium">Phone</th>
                    <th className="pb-2 pr-4 font-medium">System Access</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {member.firstName} {member.lastName}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{member.positionTitle}</Badge>
                      </td>
                      <td className="py-3 pr-4">{member.phone}</td>
                      <td className="py-3 pr-4">
                        {member.hasSystemAccess ? (
                          <Badge>Portal Access</Badge>
                        ) : (
                          <Badge variant="secondary">Staff Only</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={member.status === "ACTIVE" ? "default" : "destructive"}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground ring-offset-background transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                            <MoreVertical size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewing(member)}>
                              <Eye size={14} className="mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(member)}>
                              <Pencil size={14} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setResetTarget(member); setNewPassword(""); }}
                              disabled={!member.hasSystemAccess}
                            >
                              <KeyRound size={14} className="mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleStatus(member)}>
                              {member.status === "ACTIVE" ? (
                                <>
                                  <ShieldOff size={14} className="mr-2" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={14} className="mr-2" />
                                  Reactivate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(member)}
                              className="text-destructive"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddStaffModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => void load()}
        initial={editing}
      />

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{viewing.firstName} {viewing.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff ID</p>
                <p className="font-medium">{viewing.staffNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff ID</p>
                <p className="font-medium">{viewing.staffNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{viewing.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <Badge variant="secondary">{viewing.positionTitle}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Access</p>
                {viewing.hasSystemAccess ? (
                  <Badge>Portal Access</Badge>
                ) : (
                  <Badge variant="secondary">Staff Only</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={viewing.status === "ACTIVE" ? "default" : "destructive"}>
                  {viewing.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reset Password{resetTarget ? ` — ${resetTarget.firstName} ${resetTarget.lastName || ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reset-password">New Password</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showResetPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showResetPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void resetPassword()} disabled={resetting || newPassword.length < 8}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.firstName} {deleteTarget?.lastName}? This will soft-delete the account (set status to DELETED). This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
