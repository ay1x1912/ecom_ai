import { NextResponse, type NextRequest } from "next/server";

/**
 * Renamed from `middleware` in Next 16.
 *
 * Checks only that a session cookie EXISTS — it does not validate the token and
 * cannot see the role without a network call on every navigation. This is a
 * redirect for good UX; `requireAdmin()` in the panel layout and in each server
 * action is the boundary that counts, and the API enforces roles again itself.
 */

const SESSION_COOKIE = "babymart_admin_token";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  /**
   * Everything except /login, the Next internals and static files.
   *
   * Inverted relative to the storefront's matcher: there, protection was the
   * exception. Here the whole app is behind the login.
   */
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
