"use client";

import * as React from "react";
import { adminApiFetch, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  email?: string;
  phone?: string;
  currencyCode: string;
  timezone: string;
};

export default function TenantManagementPage() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await adminApiFetch<Tenant[]>("/tenants");
      setTenants(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Tenant Management</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={18} />
            All Tenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Slug</th>
                    <th className="pb-2 pr-4 font-medium">Contact</th>
                    <th className="pb-2 pr-4 font-medium">Currency</th>
                    <th className="pb-2 pr-4 font-medium">Timezone</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.slug}</td>
                      <td className="py-3 pr-4">
                        {tenant.email && <p className="text-xs">{tenant.email}</p>}
                        {tenant.phone && <p className="text-xs text-muted-foreground">{tenant.phone}</p>}
                      </td>
                      <td className="py-3 pr-4">{tenant.currencyCode}</td>
                      <td className="py-3 pr-4">{tenant.timezone}</td>
                      <td className="py-3">
                        <Badge variant={tenant.status === "ACTIVE" ? "default" : "destructive"}>
                          {tenant.status}
                        </Badge>
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
