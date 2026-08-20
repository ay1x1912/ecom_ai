import "server-only";

import { cookies } from "next/headers";

import type { PaginationMeta } from "@/types/api";

/**
 * The one module that knows the backend exists.
 *
 * Everything above it works in domain terms: it attaches the bearer token,
 * unwraps the `{ data, meta }` envelope, and turns `{ error: { message, fields } }`
 * into a typed throw. Marked `server-only` so the session cookie can never be
 * pulled into a client bundle by an absent-minded import.
 */

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * httpOnly cookie holding the backend JWT. Read here, written in lib/session.ts.
 *
 * DELIBERATELY a different name from the storefront's `babymart_token`. Cookies
 * are scoped by host, not by port, so on localhost both apps share a cookie jar —
 * reusing the name would mean signing into the admin silently replaced the
 * shopper's session in the other tab, and signing out of one signed out of both.
 */
export const SESSION_COOKIE = "babymart_admin_token";

type FieldIssue = { path: string; message: string };

type ErrorBody = { error?: { message?: string; fields?: FieldIssue[] } };

export class ApiError extends Error {
  readonly status: number;
  /** Backend field errors, flattened to `{ email: "…" }` for form rendering. */
  readonly fields: Record<string, string>;

  constructor(status: number, message: string, issues: FieldIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = Object.fromEntries(issues.map((i) => [i.path, i.message]));
  }
}

export type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  /**
   * Attach the caller's token. Off by default so public reads (the catalogue)
   * stay anonymous and cacheable, on for anything user-scoped.
   */
  auth?: boolean;
  cache?: RequestCache;
  /** Passed through to Next's fetch cache when `cache` opts in. */
  revalidate?: number | false;
};

export type ApiResponse<T> = { data: T; meta?: PaginationMeta };

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, API_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    // Undefined, null and "" all mean "filter not applied" — dropping them keeps
    // ?search= out of the URL and out of the backend's zod schema.
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, query, auth = false, cache, revalidate } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Caching is opt-in in Next 16. User-scoped reads must never be cached, and
    // catalogue reads are cheap enough that correctness wins by default.
    cache: cache ?? "no-store",
    ...(revalidate === undefined ? {} : { next: { revalidate } }),
  });

  if (response.status === 204) return { data: undefined as T };

  const payload = (await response.json().catch(() => null)) as
    | (ApiResponse<T> & ErrorBody)
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      payload?.error?.fields ?? [],
    );
  }

  if (!payload) throw new ApiError(response.status, "Malformed response from API");

  return payload;
}

/** Unwraps to just the data. Use when the `meta` block is not needed. */
export async function apiData<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}

/**
 * Reads that are allowed to come back empty.
 *
 * A missing product should render a 404 page, not a 500 — this collapses the
 * backend's own 404 into `null` so callers can hand it to `notFound()`.
 *
 * 403 collapses too, deliberately: for an owner-scoped resource like an order,
 * answering "forbidden" confirms the id exists to someone who may not see it.
 */
export async function apiMaybe<T>(
  path: string,
  options?: RequestOptions,
): Promise<T | null> {
  try {
    return await apiData<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

/** Narrows an unknown catch value into a message a form can display. */
export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";

export const errorFields = (error: unknown) =>
  error instanceof ApiError ? error.fields : {};
