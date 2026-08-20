"use server";

import { redirect } from "next/navigation";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { endSession, startSession } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { AuthResult } from "@/types/api";

/**
 * `next` comes from proxy.ts via the URL, so it is attacker-controllable. Only
 * relative paths are honoured — otherwise the login page is an open redirect.
 */
const safeNext = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") ? value : "/";

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let destination: string;

  try {
    const { user, token } = await apiData<AuthResult>("/api/auth/login", {
      method: "POST",
      body: {
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      },
    });

    /**
     * The role is checked BEFORE the cookie is set.
     *
     * A customer's credentials are valid credentials — the login endpoint is
     * shared with the storefront and will happily issue them a token. Setting the
     * cookie first and bouncing them afterwards would leave a signed-in session
     * for an account that can do nothing here.
     */
    if (user.role !== "admin") {
      return { message: "That account does not have administrator access." };
    }

    await startSession(token);
    destination = safeNext(String(formData.get("next") ?? "/"));
  } catch (error) {
    // The API answers a wrong email and a wrong password identically, on purpose
    // (backend defect #11), so there is nothing more specific to say here.
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  // Outside the try: redirect() signals by throwing.
  redirect(destination);
}

export async function logoutAction() {
  try {
    await apiData("/api/auth/logout", { method: "POST", auth: true });
  } catch {
    // Stateless JWT — the server has nothing to revoke, and a failed call must
    // not leave someone stuck signed in. The cookie deletion is what matters.
  }

  await endSession();
  redirect("/login");
}
