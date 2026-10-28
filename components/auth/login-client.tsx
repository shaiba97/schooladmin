"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { clearTenantLock, notifyTenantLock, tenantLockFromBody, type TenantLockNotice } from "@/lib/tenant-lock";

type TenantOption = { id: string; name: string };

type LoginResult =
  | { ok: true; roles: string[] }
  | { ok: false; message: string; tenants?: TenantOption[]; lock?: TenantLockNotice };

async function postLogin(identifier: string, password: string, tenantId?: string): Promise<LoginResult> {
  const response = await fetch("/api/session/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier,
      password,
      ...(tenantId ? { tenantId } : {}),
    }),
  });
  if (response.ok) {
    const data = await response.json().catch(() => ({}));
    const roles =
      data && typeof data === "object" && Array.isArray((data as { roles?: unknown }).roles)
        ? ((data as { roles: string[] }).roles ?? [])
        : [];
    try {
      window.sessionStorage.setItem("ad_roles", JSON.stringify(roles));
    } catch {
      // Storage unavailable — nav gates deny by default, login still works.
    }
    return { ok: true, roles };
  }
  const data = await response.json().catch(() => undefined);
  const message =
    typeof data === "object" && data && "message" in data
      ? String((data as { message: unknown }).message)
      : "Sign in failed";
  const tenants =
    response.status === 409 &&
    data &&
    typeof data === "object" &&
    "tenants" in data &&
    Array.isArray((data as { tenants: unknown }).tenants)
      ? ((data as { tenants: TenantOption[] }).tenants ?? [])
      : undefined;
  const lock = tenantLockFromBody(data) ?? undefined;
  return { ok: false, message, tenants, lock };
}

export function LoginClient() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [tenants, setTenants] = React.useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(selectedTenantId?: string) {
    setPending(true);
    setError("");
    try {
      const result = await postLogin(identifier.trim(), password, selectedTenantId);
      if (!result.ok && result.tenants && result.tenants.length > 0) {
        setTenants(result.tenants);
        setError("");
        return;
      }
      if (!result.ok && result.lock) {
        // The backend refused this account's school (TENANT_LOCKED). Show
        // the same locked-out explainer the portals show; "Try another
        // account" clears it so retrying with a different identifier works.
        notifyTenantLock(result.lock);
        return;
      }
      if (!result.ok) {
        setError(result.message);
        return;
      }
      clearTenantLock();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Admin portal is unavailable — try again");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    void submit(tenantId || undefined);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <TenantLockedNotice onRetry={() => clearTenantLock()} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogIn size={16} className="text-muted-foreground" aria-hidden />
            Administrator sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin@school.edu"
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {tenants.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-tenant">School</Label>
                <select
                  id="login-tenant"
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">Select your school…</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !identifier.trim() || !password || (tenants.length > 0 && !tenantId)}
            >
              {pending ? "Signing in…" : tenants.length > 0 ? "Continue" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              System administrators only — academic staff use the academic portal.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
