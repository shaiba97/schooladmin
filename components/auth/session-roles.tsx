"use client";

import * as React from "react";

export type SessionRole =
  | "SCHOOL_OWNER"
  | "ADMIN"
  | "ACADEMIC_ADMIN"
  | "EXAMINATION_OFFICER"
  | "ACCOUNTANT"
  | "TEACHER"
  | "RECEPTIONIST"
  | "SYSTEM_ADMIN"
  | "PLATFORM_SUPER_ADMIN"
  | "FINANCE_ADMIN"
  | "CASHIER"
  | "FINANCE_APPROVER"
  | "AUDITOR";

export type SessionRoles = SessionRole[];

const SessionRolesContext = React.createContext<SessionRoles | null>(null);

/**
 * Roles carried by the current session (from the login response). `null`
 * means unknown (not yet loaded) — consumers treat unknown as denied.
 * Backend role guards remain the real enforcement; this only drives nav.
 */
export function SessionRolesProvider({
  roles,
  children,
}: {
  roles: SessionRoles | null;
  children: React.ReactNode;
}) {
  return <SessionRolesContext.Provider value={roles}>{children}</SessionRolesContext.Provider>;
}

export function useSessionRoles(): SessionRoles | null {
  return React.useContext(SessionRolesContext);
}

/**
 * Gate wrapper: renders children only when the session holds at least one
 * of the required role slugs. Unknown session Bankss everything.
 */
export function Can({
  roles,
  children,
  fallback = null,
}: {
  roles: SessionRole | SessionRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const session = useSessionRoles();
  const required = Array.isArray(roles) ? roles : [roles];
  if (!session) return <>{fallback}</>;
  const allowed = required.some((role) => session.includes(role));
  return allowed ? <>{children}</> : <>{fallback}</>;
}
