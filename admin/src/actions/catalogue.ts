"use server";

import { refresh } from "next/cache";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";

/**
 * Categories, brands and banners — three resources with the same shape of
 * create / update / delete, written out rather than generated because a
 * "use server" module may only export async functions, so a factory could not be
 * exported anyway.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Empty means "clear this optional field", which the API models as null. */
const nullable = (form: FormData, key: string) => str(form, key) || null;

async function send(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<FormState> {
  await requireAdmin();

  try {
    await apiData(path, { method, auth: true, body });
  } catch (error) {
    // Deleting a row other rows still reference comes back as a 409 with a
    // readable message — the FK mapping is backend defect #9's fix.
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  refresh();
  return { message: undefined };
}

const categoryBody = (form: FormData) => ({
  name: str(form, "name"),
  categoryType: str(form, "categoryType"),
  image: nullable(form, "image"),
});

export const createCategoryAction = async (_p: FormState, form: FormData) =>
  send("/api/categories", "POST", categoryBody(form));

export const updateCategoryAction = async (_p: FormState, form: FormData) =>
  send(`/api/categories/${Number(form.get("id"))}`, "PUT", categoryBody(form));

export const deleteCategoryAction = async (_p: FormState, form: FormData) =>
  send(`/api/categories/${Number(form.get("id"))}`, "DELETE");

const brandBody = (form: FormData) => ({
  name: str(form, "name"),
  image: nullable(form, "image"),
});

export const createBrandAction = async (_p: FormState, form: FormData) =>
  send("/api/brands", "POST", brandBody(form));

export const updateBrandAction = async (_p: FormState, form: FormData) =>
  send(`/api/brands/${Number(form.get("id"))}`, "PUT", brandBody(form));

export const deleteBrandAction = async (_p: FormState, form: FormData) =>
  send(`/api/brands/${Number(form.get("id"))}`, "DELETE");

const bannerBody = (form: FormData) => ({
  name: str(form, "name"),
  title: nullable(form, "title"),
  // Free text on the API despite the name — a label like "From $9.99".
  startFrom: nullable(form, "startFrom"),
  bannerType: nullable(form, "bannerType"),
  image: nullable(form, "image"),
});

export const createBannerAction = async (_p: FormState, form: FormData) =>
  send("/api/banners", "POST", bannerBody(form));

export const updateBannerAction = async (_p: FormState, form: FormData) =>
  send(`/api/banners/${Number(form.get("id"))}`, "PUT", bannerBody(form));

export const deleteBannerAction = async (_p: FormState, form: FormData) =>
  send(`/api/banners/${Number(form.get("id"))}`, "DELETE");
