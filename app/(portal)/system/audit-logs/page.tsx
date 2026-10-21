"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck } from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  performedBy?: string;
  performedAt: string;
};

export default function AuditLogsPage() {
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await adminApiFetch<AuditEntry[]>("/finance/controls/audit-logs");
      setEntries(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const filtered = entries.filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (e.entityId && e.entityId.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            System Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by action, entity, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Timestamp</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Entity</th>
                    <th className="pb-2 pr-4 font-medium">Entity ID</th>
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(entry.performedAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            entry.action === "CREATE"
                              ? "default"
                              : entry.action === "DELETE"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{entry.entityType}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {entry.entityId?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {entry.performedBy?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">—</td>
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
