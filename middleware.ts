// middleware.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Require a session cookie (cc_user) for the whole app.
 * Public routes:
 *  - /login
 *  - /api/session/login
 *  - /api/session/logout
 * Static assets remain public.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js/static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  // Public endpoints
  const isPublic =
    pathname === "/login" ||
    pathname === "/api/session/login" ||
    pathname === "/api/session/logout";

  // If already logged in and visiting /login → send home
  if (pathname === "/login") {
    const hasSession = Boolean(req.cookies.get("cc_user")?.value);
    if (hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isPublic) return NextResponse.next();

  // Everything else requires the cc_user cookie
  const hasSession = Boolean(req.cookies.get("cc_user")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Optionally preserve destination:
    // url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
