"use server";

import { refresh } from "next/cache";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { Product } from "@/types/api";

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

const num = (form: FormData, key: string) => {
  const raw = str(form, key);
  return raw === "" ? undefined : Number(raw);
};

/**
 * The product payload.
 *
 * `categoryId` and `brandId` are required foreign keys — the course makes the
 * same point at [03:22]: "without that, you can't upload the product". An
 * unknown id comes back as a mapped 400 rather than a 500 (backend defect #9).
 */
const body = (form: FormData) => ({
  name: str(form, "name"),
  // The API distinguishes null (clear it) from absent (leave it) — an emptied
  // textarea means the description is being cleared.
  description: str(form, "description") || null,
  price: num(form, "price"),
  discountPercentage: num(form, "discountPercentage") ?? 0,
  stock: num(form, "stock"),
  image: str(form, "image"),
  categoryId: num(form, "categoryId"),
  brandId: num(form, "brandId"),
});

async function send(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: unknown,
): Promise<FormState> {
  await requireAdmin();

  try {
    await apiData<Product>(path, { method, auth: true, body: payload });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  refresh();
  return { message: undefined };
}

export const createProductAction = async (_p: FormState, form: FormData) =>
  send("/api/products", "POST", body(form));

export const updateProductAction = async (_p: FormState, form: FormData) =>
  send(`/api/products/${Number(form.get("id"))}`, "PUT", body(form));

export const deleteProductAction = async (_p: FormState, form: FormData) =>
  send(`/api/products/${Number(form.get("id"))}`, "DELETE");
