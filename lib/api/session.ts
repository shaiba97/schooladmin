const API_URL = process.env.ADMIN_API_URL || "https://schoolbackend-7n8a.onrender.com/api";

export const ADMIN_AUTH_HEADER = "authorization";
export const ADMIN_TENANT_HEADER = "x-tenant-id";
/** Session cookie names (populated by the login slice; auth comes last). */
export const ADMIN_TOKEN_COOKIE = "ad_token";
export const ADMIN_TENANT_COOKIE = "ad_tenant";

export class AdminSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminSessionError";
    this.status = status;
  }
}

/** Dev bypass mirroring the backend's AUTH_NO_SESSION: unauthenticated local work. */
const NO_SESSION = process.env.ADMIN_NO_AUTH === "true";

export function adminRequestHeaders(source: Headers) {
  const authorization = source.get(ADMIN_AUTH_HEADER);
  const tenantId = source.get(ADMIN_TENANT_HEADER);

  if (NO_SESSION) {
    return {
      authorization: authorization || "",
      tenantId: tenantId || process.env.NEXT_PUBLIC_TENANT_ID || "",
    };
  }
  if (!authorization) throw new AdminSessionError("Admin session is missing", 401);
  if (!tenantId) throw new AdminSessionError("Admin tenant is missing", 403);
  return { authorization, tenantId };
}

/**
 * Cookie-first resolution for the browser proxy: the login slice stores the
 * JWT + tenant in httpOnly cookies (invisible to JS), so the proxy route
 * reads them here and forwards them as headers. Direct headers still win
 * when present (server-to-server calls, dev tools).
 */
export async function getProxySession(request: Request) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const headerAuth = request.headers.get(ADMIN_AUTH_HEADER);
  const headerTenant = request.headers.get(ADMIN_TENANT_HEADER);
  const authorization =
    headerAuth || (jar.get(ADMIN_TOKEN_COOKIE)?.value ? `Bearer ${jar.get(ADMIN_TOKEN_COOKIE)?.value}` : "");
  const tenantId = headerTenant || jar.get(ADMIN_TENANT_COOKIE)?.value || "";
  return adminRequestHeaders(
    new Headers({
      ...(authorization ? { [ADMIN_AUTH_HEADER]: authorization } : {}),
      ...(tenantId ? { [ADMIN_TENANT_HEADER]: tenantId } : {}),
    }),
  );
}

/**
 * Server components/RSC fetches authenticate cookie-first when no direct
 * Authorization header exists (browser page navigations only carry the
 * session cookies, never the header). Mirrors getProxySession so SSR data
 * loads on first paint instead of falling back to client refetches.
 */
export async function getIncomingAdminHeaders() {
  const { headers, cookies } = await import("next/headers");
  const requestHeaders = await headers();
  if (NO_SESSION || requestHeaders.get(ADMIN_AUTH_HEADER)) {
    return adminRequestHeaders(requestHeaders);
  }
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  const tenantId = jar.get(ADMIN_TENANT_COOKIE)?.value;
  if (!token || !tenantId) return adminRequestHeaders(requestHeaders);
  return adminRequestHeaders(
    new Headers({
      [ADMIN_AUTH_HEADER]: `Bearer ${token}`,
      [ADMIN_TENANT_HEADER]: tenantId,
    }),
  );
}

export function adminApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
