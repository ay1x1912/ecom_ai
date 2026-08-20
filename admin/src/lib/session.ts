import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiData, SESSION_COOKIE } from "@/lib/api";
import type { UserWithAddresses } from "@/types/api";

/**
 * Session handling for the admin panel.
 *
 * Same model as the storefront: the backend is the only identity source, the JWT
 * lives in an httpOnly cookie, and the role comes from the server on every
 * request rather than from a decoded client-side claim.
 *
 * A Vite SPA — which is what the course builds — has no server and so has to keep
 * the token in localStorage, where any script on the origin can read it. Being on
 * Next means that trade never has to be made.
 */

/** Matches JWT_EXPIRES_IN=7d, so cookie and token expire together. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function startSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
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
 * The signed-in account, or null.
 *
 * `cache` keeps the header, the layout guard and any server action in one request
 * down to a single call to /api/auth/profile.
 */
export const getSession = cache(async (): Promise<UserWithAddresses | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await apiData<UserWithAddresses>("/api/auth/profile", { auth: true });
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return null;
    throw error;
  }
});

/**
 * Admin, or bounced.
 *
 * Called by the panel layout AND by every mutating server action. Not redundant:
 * `proxy.ts` only knows whether a cookie exists, and a server action is a public
 * HTTP endpoint that the layout's guard says nothing about.
 *
 * A valid token is not authorisation — a customer's token is perfectly valid. The
 * profile is what says whether it may be here, so a signed-in non-admin is sent
 * to a page that explains that, rather than to a wall of failed requests.
 */
export async function requireAdmin(): Promise<UserWithAddresses> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login?denied=1");
  return user;
}
