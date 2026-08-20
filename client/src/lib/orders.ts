import "server-only";

import { apiMaybe, apiRequest } from "@/lib/api";
import type { Order, OrderStatus, PaginationMeta } from "@/types/api";

export type OrderListParams = {
  page?: number;
  perPage?: number;
  status?: OrderStatus;
  sortBy?: "createdAt" | "total" | "status";
  sortOrder?: "asc" | "desc";
};

const list = async (
  path: string,
  params: OrderListParams,
): Promise<{ orders: Order[]; meta: PaginationMeta }> => {
  const { data, meta } = await apiRequest<Order[]>(path, { query: params, auth: true });
  return {
    orders: data,
    meta: meta ?? { page: 1, perPage: data.length, total: data.length, totalPages: 1 },
  };
};

/** Admin only — the backend enforces it; this is just the call site. */
export const listAllOrders = (params: OrderListParams = {}) => list("/api/orders", params);

export const listMyOrders = (params: OrderListParams = {}) => list("/api/orders/my", params);

/**
 * Owner or admin.
 *
 * Null covers both "no such order" and "not yours" — the backend answers 403 for
 * the second, and rendering a 404 rather than a 403 avoids confirming that an
 * order id exists to someone who cannot see it.
 */
export const getOrder = (id: number | string) =>
  apiMaybe<Order>(`/api/orders/${id}`, { auth: true });
