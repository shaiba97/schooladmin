import { NextResponse } from "next/server";
import { adminApiUrl, ADMIN_TENANT_COOKIE, ADMIN_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

type Membership = {
  tenantId: string;
  status: string;
  tenant: { id: string; name: string };
  roles: Array<{ slug: string }>;
};

type LoginResponse = {
  accessToken: string;
  memberships: Membership[];
};

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function sessionCookies(token: string, tenantId: string) {
  const secure = process.env.NODE_ENV === "production";
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? "; Secure" : ""}`;
  return [
    `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; ${base}`,
    `${ADMIN_TENANT_COOKIE}=${encodeURIComponent(tenantId)}; ${base}`,
  ];
}

/**
 * Admin login. System administrators sign in with email plus a password.
 * The caller must hold an ADMIN-role membership — academic staff use the
 * academic portal instead. When several schools match, the frontend
 * re-posts with an explicit tenantId.
 */
export async function POST(request: Request) {
  let body: { identifier?: string; password?: string; tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  const identifier = body.identifier?.trim() ?? "";
  const password = body.password ?? "";
  if (!identifier || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const payload: Record<string, string> = { email: identifier, password };
  if (body.tenantId) payload.tenantId = body.tenantId;

  let upstream: Response;
  try {
    upstream = await fetch(adminApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Admin API is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => undefined);
    // A locked-school refusal is a flat body (code TENANT_LOCKED) the login
    // screen reads lock facts from; forward it whole instead of just the
    // message like other errors.
    if (data && typeof data === "object" && (data as { code?: unknown }).code === "TENANT_LOCKED") {
      return NextResponse.json(data, { status: upstream.status });
    }
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Sign in failed";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  const adminMemberships = (data.memberships ?? []).filter(
    (m) => m.status === "ACTIVE" && m.roles.some((r) => r.slug === "ADMIN"),
  );
  if (adminMemberships.length === 0) {
    return NextResponse.json(
      { message: "This account has no administrator access" },
      { status: 403 },
    );
  }
  if (adminMemberships.length > 1 && !body.tenantId) {
    return NextResponse.json(
      {
        message: "Select your school",
        tenants: adminMemberships.map((m) => ({ id: m.tenantId, name: m.tenant.name })),
      },
      { status: 409 },
    );
  }
  const membership =
    adminMemberships.find((m) => m.tenantId === body.tenantId) ?? adminMemberships[0];

  const response = NextResponse.json({
    ok: true,
    tenant: { id: membership.tenantId, name: membership.tenant.name },
    roles: membership.roles.map((r) => r.slug),
  });
  for (const cookie of sessionCookies(data.accessToken, membership.tenantId)) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
