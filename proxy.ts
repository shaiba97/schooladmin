import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_NO_AUTH_BYPASS } from "./lib/auth-flag";
import { ADMIN_TOKEN_COOKIE } from "./lib/api/session";

const PORTAL_PATHS = ["/dashboard", "/financial", "/people", "/system", "/admin", "/academic"];

/**
 * Portal guard (Next 16 `proxy` convention): cookie presence only. Token
 * validity is enforced per request by the backend (401s redirect to /login
 * client-side). Section-level access is enforced by Can gates + backend
 * role guards, never by this cookie check alone.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPortalPath = PORTAL_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (ADMIN_NO_AUTH_BYPASS) return NextResponse.next();

  if (isPortalPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/financial",
    "/people",
    "/system",
    "/admin",
    "/academic",
    "/dashboard/:path*",
    "/financial/:path*",
    "/people/:path*",
    "/system/:path*",
    "/admin/:path*",
    "/academic/:path*",
    "/login",
  ],
};
