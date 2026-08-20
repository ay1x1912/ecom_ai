import "server-only";

import { apiData, apiMaybe, apiRequest } from "@/lib/api";
import { DEFAULT_PER_PAGE } from "@/lib/list-params";
import type {
  Banner,
  Brand,
  Category,
  Order,
  OrderStatus,
  PaginationMeta,
  Product,
  Role,
  StatsResponse,
  User,
  UserWithAddresses,
} from "@/types/api";

/**
 * Every read the panel makes.
 *
 * All of them are admin-scoped, so `auth: true` throughout — the token is
 * attached server-side by lib/api.ts and never reaches the browser.
 */

type ListResult<T> = { rows: T[]; meta: PaginationMeta };

const list = async <T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  auth = false,
): Promise<ListResult<T>> => {
  const { data, meta } = await apiRequest<T[]>(path, { query, auth });
  return {
    rows: data,
    // The API always sends meta on a list; the fallback keeps the type honest
    // rather than making every caller null-check pagination.
    meta: meta ?? { page: 1, perPage: data.length, total: data.length, totalPages: 1 },
  };
};

// --- users ---------------------------------------------------------------

export type UserListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  role?: Role;
  sortBy?: "createdAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
};

export const listUsers = (params: UserListParams = {}) =>
  list<User>("/api/users", { perPage: DEFAULT_PER_PAGE, ...params }, true);

export const getUser = (id: number | string) =>
  apiMaybe<UserWithAddresses>(`/api/users/${id}`, { auth: true });

// --- catalogue -----------------------------------------------------------

export type ProductListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  categoryId?: number;
  brandId?: number;
  inStock?: boolean;
  sortBy?: "createdAt" | "name" | "price" | "averageRating";
  sortOrder?: "asc" | "desc";
};

export const listProducts = (params: ProductListParams = {}) =>
  list<Product>("/api/products", { perPage: DEFAULT_PER_PAGE, ...params });

export const getProduct = (id: number | string) =>
  apiMaybe<Product>(`/api/products/${id}`);

export type SimpleListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const listCategories = (params: SimpleListParams = {}) =>
  list<Category>("/api/categories", { perPage: DEFAULT_PER_PAGE, ...params });

export const listBrands = (params: SimpleListParams = {}) =>
  list<Brand>("/api/brands", { perPage: DEFAULT_PER_PAGE, ...params });

export const listBanners = (params: SimpleListParams = {}) =>
  list<Banner>("/api/banners", { perPage: DEFAULT_PER_PAGE, ...params });

/**
 * Every category and brand, for the product form's two selects.
 *
 * perPage is pinned at the API's maximum: these are small reference tables and a
 * paginated <select> would be a worse answer than one request.
 */
export const allCategories = () =>
  apiData<Category[]>("/api/categories", { query: { perPage: 100, sortBy: "name" } });

export const allBrands = () =>
  apiData<Brand[]>("/api/brands", { query: { perPage: 100, sortBy: "name" } });

// --- orders --------------------------------------------------------------

export type OrderListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: OrderStatus;
  sortBy?: "createdAt" | "total" | "status";
  sortOrder?: "asc" | "desc";
};

export const listOrders = (params: OrderListParams = {}) =>
  list<Order>("/api/orders", { perPage: DEFAULT_PER_PAGE, ...params }, true);

export const getOrder = (id: number | string) =>
  apiMaybe<Order>(`/api/orders/${id}`, { auth: true });

// --- dashboard -----------------------------------------------------------

export const getStats = (topLimit = 5, recentLimit = 5) =>
  apiData<StatsResponse>("/api/stats", { query: { topLimit, recentLimit }, auth: true });
