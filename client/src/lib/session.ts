import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiData, SESSION_COOKIE } from "@/lib/api";
import type { UserWithAddresses } from "@/types/api";

/**
 * Session handling, all forty lines of it.
 *
 * The backend is the only identity source and it hands back a JWT, so a session
 * is one httpOnly cookie plus a profile read. There is no second store to keep in
 * sync and no client-side decoding of claims: the role is whatever the server
 * said this request, not whatever a token said when it was issued.
 */

/** Matches JWT_EXPIRES_IN=7d on the backend, so the cookie and the token expire together. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function startSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    // httpOnly is the whole point: a token readable by JavaScript is readable by
    // any script that gets injected onto the page.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The current user, or null.
 *
 * Wrapped in React's `cache` so the header, the page and any server action in the
 * same request share one call to /api/auth/profile instead of three.
 */
export const getSession = cache(async (): Promise<UserWithAddresses | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await apiData<UserWithAddresses>("/api/auth/profile", { auth: true });
  } catch (error) {
    // An expired or tampered token is not an error condition for the UI — it is
    // simply a signed-out visitor.
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return null;
    throw error;
  }
});

/**
 * Signed-in or bounced to /login.
 *
 * `proxy.ts` already redirects unauthenticated navigations, but that is UX, not a
 * boundary — server actions are public HTTP endpoints and have to check for
 * themselves.
 */
export async function requireUser(returnTo?: string): Promise<UserWithAddresses> {
  const user = await getSession();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}

export async function requireAdmin(): Promise<UserWithAddresses> {
  const user = await getSession();
  if (!user) redirect("/login?next=%2Fadmin");
  // A signed-in customer who guesses an admin URL gets 404, not a redirect loop
  // into a page they will never be allowed to see.
  if (user.role !== "admin") redirect("/");
  return user;
}
