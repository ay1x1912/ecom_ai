import { NextResponse, type NextRequest } from "next/server";

/**
 * Renamed from `middleware` in Next 16 — same hook, clearer name.
 *
 * This only checks that a session cookie EXISTS. It does not validate the token
 * and it cannot see the user's role, both of which would mean a network call on
 * every navigation. Treat it as a redirect for good UX; the real checks live in
 * `requireUser` / `requireAdmin` on the server, and in the API itself.
 */

const SESSION_COOKIE = "babymart_token";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  // Preserve where they were heading so sign-in can send them back.
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/cart", "/checkout", "/orders/:path*", "/admin/:path*"],
};
