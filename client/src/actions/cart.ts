"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { apiData, errorMessage } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Cart } from "@/types/api";

/**
 * Cart mutations.
 *
 * Every one of them ends in `refresh()`, Next 16's server-action hook for
 * re-rendering the client router. Nothing here is cached — the cart is per-user
 * and fetched with `no-store` — so a refresh is all that is needed to get the
 * header badge and the cart page back in agreement with the server.
 */

export type CartActionState = { ok: boolean; message?: string } | null;

const asNumber = (form: FormData, key: string) => Number(form.get(key) ?? 0);

/**
 * Signed-out visitors have no cart to add to: /api/cart is token-only. Send them
 * to sign in and bring them back to the page they were on.
 */
async function requireSessionOr(next: string): Promise<void> {
  if (!(await getSession())) {
    redirect(`/login?next=${encodeURIComponent(next || "/products")}`);
  }
}

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const next = String(formData.get("next") ?? "/products");
  await requireSessionOr(next);

  try {
    await apiData<Cart>("/api/cart", {
      method: "POST",
      auth: true,
      body: {
        productId: asNumber(formData, "productId"),
        quantity: asNumber(formData, "quantity") || 1,
      },
    });
  } catch (error) {
    // Stock conflicts arrive here as a 409 with a useful message
    // ("Only 3 of X available") — pass it straight through to the toast.
    return { ok: false, message: errorMessage(error) };
  }

  refresh();
  return { ok: true, message: "Added to cart" };
}

export async function updateCartItemAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = asNumber(formData, "productId");
  const quantity = asNumber(formData, "quantity");

  // The backend caps at 100 per line and refuses 0; removing is a different verb.
  if (quantity < 1) return removeCartItemAction(null, formData);

  try {
    await apiData<Cart>(`/api/cart/${productId}`, {
      method: "PUT",
      auth: true,
      body: { quantity },
    });
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }

  refresh();
  return { ok: true };
}

export async function removeCartItemAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  try {
    await apiData<Cart>(`/api/cart/${asNumber(formData, "productId")}`, {
      method: "DELETE",
      auth: true,
    });
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }

  refresh();
  return { ok: true, message: "Removed from cart" };
}

export async function clearCartAction(): Promise<void> {
  try {
    await apiData<Cart>("/api/cart", { method: "DELETE", auth: true });
  } catch {
    // Nothing useful to say: the cart page re-renders either way.
  }

  refresh();
}
