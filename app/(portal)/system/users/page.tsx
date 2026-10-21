"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserCog, ShieldCheck, ShieldOff } from "lucide-react";

type MembershipRow = {
  id: string;
  status: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  roles: Array<{ role: { slug: string; name: string } | null }>;
};

export default function UsersPage() {
  const [users, setUsers] = React.useState<MembershipRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await adminApiFetch<{ data: MembershipRow[] }>("/memberships?page=1&limit=200");
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load memberships");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function toggleStatus(user: MembershipRow) {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await adminApiFetch(`/memberships/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  const filtered = users.filter(
    (u) =>
      `${u.user.firstName} ${u.user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.user.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Users & Access</h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog size={18} />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Roles</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((membership) => (
                    <tr key={membership.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {membership.user.firstName} {membership.user.lastName}
                      </td>
                      <td className="py-3 pr-4">{membership.user.email}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {membership.roles
                            .map((mr) => mr.role?.slug)
                            .filter(Boolean)
                            .map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={membership.status === "ACTIVE" ? "default" : "destructive"}>
                          {membership.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleStatus(membership)}
                        >
                          {membership.status === "ACTIVE" ? (
                            <>
                              <ShieldOff size={14} className="mr-1" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={14} className="mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
