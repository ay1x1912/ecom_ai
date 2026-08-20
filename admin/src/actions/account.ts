"use server";

import { refresh } from "next/cache";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { User } from "@/types/api";

/**
 * The signed-in admin editing their own record.
 *
 * Deliberately never sends `role`. The API would allow it — an admin may set
 * roles — but demoting yourself from the account page locks you out of the panel
 * on the next request, with no way back in short of another admin or the seeder.
 * Changing your own role is a Users-screen action, done knowingly.
 */
export async function updateAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const password = String(formData.get("password") ?? "");

  try {
    await apiData<User>(`/api/users/${admin.id}`, {
      method: "PUT",
      auth: true,
      body: {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        avatar: String(formData.get("avatar") ?? "").trim() || null,
        // Omitted rather than sent empty — the schema wants 8+ characters, so ""
        // would fail every save that was not changing the password.
        ...(password ? { password } : {}),
      },
    });
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  refresh();
  return { message: undefined };
}
