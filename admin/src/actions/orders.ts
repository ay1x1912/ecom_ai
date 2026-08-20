"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { apiData, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { Order, OrderStatus } from "@/types/api";

export async function updateOrderStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await apiData<Order>(`/api/orders/${Number(formData.get("orderId"))}/status`, {
      method: "PUT",
      auth: true,
      body: { status: String(formData.get("status")) as OrderStatus },
    });
  } catch (error) {
    // An illegal move returns a 409 naming both states. The UI only offers legal
    // ones, so reaching this means the order changed under us.
    return { message: errorMessage(error) };
  }

  refresh();
  return { message: undefined };
}

/**
 * Delete an order.
 *
 * Rare and destructive — an order is a financial record, and cancelling is
 * almost always what is actually wanted. Offered only from the detail page,
 * behind a confirmation, and never from the list.
 */
export async function deleteOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await apiData(`/api/orders/${Number(formData.get("orderId"))}`, {
      method: "DELETE",
      auth: true,
    });
  } catch (error) {
    return { message: errorMessage(error) };
  }

  redirect("/orders");
}
