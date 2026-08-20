import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { ApiError, apiData, SESSION_COOKIE } from "@/lib/api";
import type { Cart } from "@/types/api";

/**
 * The caller's cart, or null when signed out.
 *
 * There is no guest cart: every /api/cart route requires a token, so a visitor
 * without one has nowhere to put items. The header and the cart page both treat
 * null as "sign in to start a cart" rather than as an error.
 *
 * `cache` keeps the header badge and the cart page to a single request.
 */
export const getCart = cache(async (): Promise<Cart | null> => {
  if (!(await cookies()).get(SESSION_COOKIE)) return null;

  try {
    return await apiData<Cart>("/api/cart", { auth: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});
