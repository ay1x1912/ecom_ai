"use server";

import { redirect } from "next/navigation";

import { apiData, errorMessage } from "@/lib/api";
import type { FormState } from "@/actions/types";
import type { SettleResult } from "@/types/api";

/**
 * Settle a mock payment.
 *
 * This posts to POST /api/payment/mock/settle, which is deliberately
 * UNAUTHENTICATED on the backend: it is shaped like a gateway webhook, so the
 * settlement path exercised here is the same one a real provider will drive.
 * That endpoint is only registered when PAYMENT_PROVIDER=mock, and the backend
 * refuses to boot with mock in production.
 *
 * Sending it from a server action rather than the browser keeps the API's base
 * URL server-side, but the call carries no credentials either way.
 */
export async function settleMockPaymentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");

  if (!sessionId) return { message: "This payment link is missing its session id." };

  let orderId: number;

  try {
    const result = await apiData<SettleResult>("/api/payment/mock/settle", {
      method: "POST",
      body: { sessionId, outcome },
    });
    orderId = result.order.id;
  } catch (error) {
    return { message: errorMessage(error) };
  }

  redirect(`/orders/${orderId}`);
}
