"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { Address, CheckoutSession, Order } from "@/types/api";

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/**
 * Add a shipping address.
 *
 * Needed at checkout because POST /api/orders takes an `addressId` and nothing
 * else — there is no way to pass a typed-in address along with the order, so an
 * account with no saved address cannot check out until this runs.
 */
export async function addAddressAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/checkout");

  try {
    await apiData<Address>(`/api/users/${user.id}/addresses`, {
      method: "POST",
      auth: true,
      body: {
        street: str(formData, "street"),
        city: str(formData, "city"),
        country: str(formData, "country"),
        postalCode: str(formData, "postalCode"),
        note: str(formData, "note") || undefined,
        isDefault: formData.get("isDefault") === "on",
      },
    });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  // getSession is cached per request, so the new address appears on the re-render.
  refresh();
  return { message: undefined };
}

/**
 * Place the order and start payment.
 *
 * Two calls, in this order, because the payment session needs an order id:
 *   1. POST /api/orders  — server builds the order from the cart, re-prices it,
 *      locks and decrements stock, empties the cart.
 *   2. POST /api/payment/checkout-session — attaches a provider session and
 *      returns where to send the browser.
 *
 * The client sends an address id and nothing else. No items, no prices, no total.
 */
export async function placeOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser("/checkout");

  const addressId = Number(formData.get("addressId"));
  if (!addressId) return { message: "Choose a shipping address first." };

  let order: Order;

  try {
    order = await apiData<Order>("/api/orders", {
      method: "POST",
      auth: true,
      body: { addressId },
    });
  } catch (error) {
    // Typical failures: a product sold out between cart and checkout (409), or
    // the cart emptied in another tab (400). Both are worth showing verbatim.
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  /**
   * From here the order EXISTS and the cart is gone, so failing back to the
   * checkout page would strand the customer with no cart and no order in sight.
   * Send them to the order instead, where "Pay now" retries this same step.
   */
  let destination: string;
  try {
    destination = (await startPayment(order.id)).checkoutUrl;
  } catch {
    destination = `/orders/${order.id}`;
  }

  redirect(destination);
}

/** Shared by checkout and by the "Pay now" button on a pending order. */
async function startPayment(orderId: number): Promise<CheckoutSession> {
  return apiData<CheckoutSession>("/api/payment/checkout-session", {
    method: "POST",
    auth: true,
    body: { orderId },
  });
}

/**
 * Retry payment for an order that is still pending.
 *
 * The backend refuses this for any other status, so an already-paid order cannot
 * be charged twice by reloading the page.
 */
export async function payOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser("/orders");

  const orderId = Number(formData.get("orderId"));
  let destination: string;

  try {
    destination = (await startPayment(orderId)).checkoutUrl;
  } catch (error) {
    return { message: errorMessage(error) };
  }

  redirect(destination);
}
