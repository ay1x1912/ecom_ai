"use server";

import { refresh } from "next/cache";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { Order, OrderStatus, Product } from "@/types/api";

/**
 * Admin mutations.
 *
 * Each one re-checks the role with `requireAdmin` before touching the API. A
 * server action is a public HTTP endpoint — the admin layout guarding the page
 * says nothing about who can POST to the action behind it. The backend enforces
 * this a third time; none of the three layers is redundant.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

const optionalNumber = (form: FormData, key: string) => {
  const raw = str(form, key);
  return raw === "" ? undefined : Number(raw);
};

export async function updateProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));

  try {
    await apiData<Product>(`/api/products/${id}`, {
      method: "PUT",
      auth: true,
      body: {
        name: str(formData, "name"),
        // The API distinguishes null (clear it) from absent (leave it alone);
        // an emptied textarea means the description is being cleared.
        description: str(formData, "description") || null,
        price: optionalNumber(formData, "price"),
        discountPercentage: optionalNumber(formData, "discountPercentage") ?? 0,
        stock: optionalNumber(formData, "stock"),
        image: str(formData, "image"),
        categoryId: optionalNumber(formData, "categoryId"),
        brandId: optionalNumber(formData, "brandId"),
      },
    });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  // The storefront reads products with no-store, so a refresh is enough for the
  // admin's own view; shoppers pick up the change on their next request.
  refresh();
  return { message: undefined };
}

export async function updateOrderStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const id = Number(formData.get("orderId"));
  const status = str(formData, "status") as OrderStatus;

  try {
    await apiData<Order>(`/api/orders/${id}/status`, {
      method: "PUT",
      auth: true,
      body: { status },
    });
  } catch (error) {
    // Illegal transitions come back as a 409 naming both states, e.g.
    // 'Cannot change status from "completed" to "paid"'.
    return { message: errorMessage(error) };
  }

  refresh();
  return { message: undefined };
}
