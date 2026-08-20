"use server";

import { refresh } from "next/cache";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { User } from "@/types/api";

/**
 * User mutations.
 *
 * Create and update only — there is deliberately no delete. `DELETE /api/users/:id`
 * is a hard delete and there is no `isActive` column to soft-delete into, so the
 * panel does not offer either.
 *
 * `requireAdmin()` runs first in both: a server action is a public HTTP endpoint,
 * and the layout guarding the page says nothing about who can post to it.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await apiData<User>("/api/users", {
      method: "POST",
      auth: true,
      body: {
        name: str(formData, "name"),
        email: str(formData, "email"),
        password: String(formData.get("password") ?? ""),
        // This endpoint is the ONLY legitimate place a role is assigned. Public
        // registration strips the field entirely (backend defect #1).
        role: str(formData, "role") || "user",
      },
    });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  refresh();
  return { message: undefined };
}

export async function updateUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const password = String(formData.get("password") ?? "");

  try {
    await apiData<User>(`/api/users/${Number(formData.get("id"))}`, {
      method: "PUT",
      auth: true,
      body: {
        name: str(formData, "name"),
        email: str(formData, "email"),
        role: str(formData, "role"),
        avatar: str(formData, "avatar") || null,
        // Omitted rather than sent empty: the API's schema requires at least 8
        // characters, so "" would be a validation error on every save that was
        // not trying to change the password.
        ...(password ? { password } : {}),
      },
    });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  refresh();
  return { message: undefined };
}
