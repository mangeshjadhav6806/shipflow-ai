import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that are completely open
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes("."); // matches files like /logo.png, etc.

  if (isPublicPath) {
    return NextResponse.next();
  }

  try {
    // Call the official BetterAuth session verification API endpoint using request cookies
    const response = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    const session = response.ok ? await response.json() : null;

    if (!session) {
      // Unauthenticated: Redirect to login with callback URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated: Proceed
    return NextResponse.next();
  } catch (error) {
    console.error("[Middleware] BetterAuth session fetch error:", error);
    // Secure-fail: Redirect to login on error
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (BetterAuth endpoints)
     * - api/webhooks (webhook endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/webhooks).*)",
  ],
};
