"use server";

import { refresh } from "next/cache";

import { apiData, errorMessage } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { Order, OrderStatus } from "@/types/api";

/**
 * Cancel an order.
 *
 * The backend allows the owner to move only pending → cancelled; every other
 * transition is admin-only and refused here. Stock is returned inside that same
 * transaction, so there is nothing for the client to undo.
 */
export async function cancelOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser("/orders");

  try {
    await apiData<Order>(`/api/orders/${Number(formData.get("orderId"))}/status`, {
      method: "PUT",
      auth: true,
      body: { status: "cancelled" satisfies OrderStatus },
    });
  } catch (error) {
    return { message: errorMessage(error) };
  }

  refresh();
  return null;
}
