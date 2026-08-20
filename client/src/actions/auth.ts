"use server";

import { redirect } from "next/navigation";

import { apiData, errorFields, errorMessage } from "@/lib/api";
import { endSession, startSession } from "@/lib/session";
import type { FormState } from "@/actions/types";
import type { AuthResult } from "@/types/api";

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/**
 * Where to send someone after they sign in.
 *
 * `next` is attacker-controllable (proxy.ts puts it in the URL), so only relative
 * paths are honoured — otherwise the login page becomes an open redirect.
 */
const safeNext = (value: string, fallback: string) =>
  value.startsWith("/") && !value.startsWith("//") ? value : fallback;

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let destination: string;

  try {
    const { user, token } = await apiData<AuthResult>("/api/auth/login", {
      method: "POST",
      body: { email: str(formData, "email"), password: String(formData.get("password") ?? "") },
    });

    await startSession(token);
    destination = safeNext(str(formData, "next"), user.role === "admin" ? "/admin" : "/products");
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  // Outside the try: redirect() signals by throwing, and catching it here would
  // turn a successful sign-in into "Something went wrong".
  redirect(destination);
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const street = str(formData, "street");
  const city = str(formData, "city");
  const country = str(formData, "country");
  const postalCode = str(formData, "postalCode");

  // The backend takes an optional address, but all four parts or none — a
  // half-filled address would fail its schema with a confusing per-field error.
  const partial = [street, city, country, postalCode].filter(Boolean);
  if (partial.length > 0 && partial.length < 4) {
    return {
      message: "Fill in the whole address, or leave all four fields empty.",
      fields: {
        street: street ? "" : "Required",
        city: city ? "" : "Required",
        country: country ? "" : "Required",
        postalCode: postalCode ? "" : "Required",
      },
    };
  }

  try {
    const { token } = await apiData<AuthResult>("/api/auth/register", {
      method: "POST",
      body: {
        name: str(formData, "name"),
        email: str(formData, "email"),
        password: String(formData.get("password") ?? ""),
        ...(partial.length === 4 ? { address: { street, city, country, postalCode } } : {}),
      },
    });

    await startSession(token);
  } catch (error) {
    return { message: errorMessage(error), fields: errorFields(error) };
  }

  redirect(safeNext(str(formData, "next"), "/products"));
}

export async function logoutAction() {
  // Best effort: the JWT is stateless, so the backend has nothing to revoke and
  // the cookie deletion below is what actually ends the session.
  try {
    await apiData("/api/auth/logout", { method: "POST", auth: true });
  } catch {
    // Ignored on purpose — a failed call must not leave someone stuck signed in.
  }

  await endSession();
  redirect("/login");
}
